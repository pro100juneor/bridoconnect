import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// Insert transaction with (processor, stripe_event_id) UNIQUE.
// Returns true if newly inserted; false on duplicate (already processed).
async function recordTransaction(row: {
  event_id: string;
  user_id: string;
  deal_id?: string | null;
  amount: number;
  amount_cents?: number;
  type: string;
  status?: string;
  payment_intent_id?: string | null;
  fee_platform_cents?: number;
}): Promise<boolean> {
  const { error } = await supabase.from("transactions").insert({
    processor: "stripe",
    stripe_event_id: row.event_id,
    user_id: row.user_id,
    deal_id: row.deal_id ?? null,
    amount: row.amount,
    amount_cents: row.amount_cents,
    type: row.type,
    status: row.status ?? "completed",
    stripe_payment_intent_id: row.payment_intent_id ?? null,
    fee_platform_cents: row.fee_platform_cents ?? 0,
  });
  if (error) {
    // 23505 = unique_violation → already processed, swallow.
    if ((error as { code?: string }).code === "23505") return false;
    console.error("recordTransaction error:", error);
    throw error;
  }
  return true;
}

serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "bad signature";
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const md = session.metadata || {};
        const dealId = md.dealId || null;
        const userId = md.user_id || "";
        const recipientId = md.recipient_id || null;
        const type = md.type || (dealId ? "deal_payment" : "deposit");
        const amountCents = session.amount_total || 0;
        const amount = amountCents / 100;
        const feeCents = Number(md.platform_fee_cents || 0);
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);

        const inserted = await recordTransaction({
          event_id: event.id,
          user_id: userId,
          deal_id: dealId,
          amount,
          amount_cents: amountCents,
          type,
          payment_intent_id: paymentIntentId,
          fee_platform_cents: feeCents,
        });

        if (!inserted) break; // already processed

        if (dealId) {
          // Update deal raised + payment_intent_id (for later refund/escrow).
          const { error: incErr } = await supabase.rpc("increment_raised", {
            deal_id: dealId,
            amount,
          });
          if (incErr) console.error("increment_raised:", incErr);

          await supabase
            .from("deals")
            .update({
              stripe_payment_intent_id: paymentIntentId,
              sponsor_id: userId,
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", dealId);

          // Mirror a recipient-side ledger entry so they see incoming funds.
          if (recipientId) {
            await supabase.from("transactions").insert({
              processor: "stripe",
              stripe_event_id: `${event.id}::recipient`,
              user_id: recipientId,
              deal_id: dealId,
              amount: amount - feeCents / 100,
              amount_cents: amountCents - feeCents,
              type: "deal_payment",
              status: "held_in_escrow",
              stripe_payment_intent_id: paymentIntentId,
            });
          }
        }
        break;
      }

      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        const status =
          acct.charges_enabled && acct.payouts_enabled
            ? "enabled"
            : acct.requirements?.disabled_reason
              ? "restricted"
              : "pending";
        await supabase
          .from("profiles")
          .update({
            stripe_connect_status: status,
            stripe_connect_country: acct.country || null,
            stripe_connect_updated_at: new Date().toISOString(),
          })
          .eq("stripe_connect_account_id", acct.id);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (!paymentIntentId) break;
        const { data: deal } = await supabase
          .from("deals")
          .select("id, creator_id, sponsor_id, amount_cents")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();
        if (!deal) break;
        const refundedCents = charge.amount_refunded;
        await recordTransaction({
          event_id: event.id,
          user_id: deal.sponsor_id || "",
          deal_id: deal.id,
          amount: refundedCents / 100,
          amount_cents: refundedCents,
          type: "refund",
        });
        await supabase
          .from("deals")
          .update({
            refunded_at: new Date().toISOString(),
            status: refundedCents >= (deal.amount_cents || 0) ? "cancelled" : "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", deal.id);
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const paymentIntentId =
          typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
        if (!paymentIntentId) break;
        const { data: deal } = await supabase
          .from("deals")
          .select("id, sponsor_id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();
        if (deal) {
          await supabase
            .from("deals")
            .update({
              status: "disputed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", deal.id);
          if (deal.sponsor_id) {
            await supabase.from("disputes").insert({
              deal_id: deal.id,
              opener_id: deal.sponsor_id,
              reason: "stripe_chargeback",
              description: `Stripe dispute ${dispute.id} (${dispute.reason})`,
            });
          }
        }
        break;
      }

      case "transfer.created": {
        // For destination charges, transfer is auto on capture. We record it
        // for reconciliation but actual escrow release is sponsor-triggered.
        const transfer = event.data.object as Stripe.Transfer;
        const sourceTx = transfer.source_transaction;
        if (sourceTx) {
          const charge = await stripe.charges.retrieve(typeof sourceTx === "string" ? sourceTx : sourceTx.id);
          const piId =
            typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
          if (piId) {
            await supabase
              .from("deals")
              .update({
                stripe_transfer_id: transfer.id,
              })
              .eq("stripe_payment_intent_id", piId);
          }
        }
        break;
      }

      default:
        // Unknown event types are acked silently; Stripe will retry on 5xx.
        break;
    }
  } catch (err: unknown) {
    console.error("webhook handler error:", err);
    // Return 500 so Stripe retries — safer than swallowing.
    return new Response("handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
