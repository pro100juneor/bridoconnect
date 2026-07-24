import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTransactionalEmail, type Template } from "../_shared/email.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// Транзакционное уведомление получателю средств. Никогда не ломает webhook:
// email опционален (no-op без RESEND_API_KEY), любые ошибки только логируются.
// Локаль пока дефолтная 'uk' (в profiles нет поля предпочитаемого языка).
async function notifyUser(
  userId: string | null,
  template: Template,
  vars: Record<string, string | number>
): Promise<void> {
  if (!userId) return;
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    const to = data?.user?.email;
    if (!to) return;
    await sendTransactionalEmail({ to, template, locale: "uk", vars, userId, supabase });
  } catch (err) {
    console.error("notifyUser error:", err);
  }
}

// Insert transaction (idempotent at PG via UNIQUE constraint).
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
        const streamId = md.streamId || null;
        const productId = md.productId || null;
        const userId = md.user_id || "";
        const recipientId = md.recipient_id || null;
        const type = md.type || (productId ? "product_purchase" : dealId ? "deal_payment" : "deposit");
        const amountCents = session.amount_total || 0;
        const amount = amountCents / 100;
        const feeCents = Number(md.platform_fee_cents || 0);
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);

        // P0-4 fix: apply_stripe_payment is atomic + idempotent via PI marker.
        // Even if recordTransaction (below) already returned false (duplicate
        // event), the RPC still no-ops safely because the PI is already on the deal.
        if (dealId && paymentIntentId) {
          const { error: applyErr } = await supabase.rpc("apply_stripe_payment", {
            p_deal_id: dealId,
            p_amount: amount,
            p_payment_intent_id: paymentIntentId,
            p_sponsor_id: userId || null,
          });
          if (applyErr) {
            console.error("apply_stripe_payment:", applyErr);
            throw applyErr;
          }
        }

        // Promotion: activate the paid placement (idempotent — only flips a row
        // that is not already active). min_visible_until = now()+3min gives the
        // >=3-minute top-group guarantee; expires_at from tier/durationHours.
        if (type === "promotion" && md.promotionId) {
          const hours = Number(md.durationHours) > 0 ? Number(md.durationHours) : 24;
          const { data: promoRow } = await supabase
            .from("promotions")
            .update({
              status: "active",
              activated_at: new Date().toISOString(),
              starts_at: new Date().toISOString(),
              min_visible_until: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
              expires_at: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
            })
            .eq("id", md.promotionId)
            .neq("status", "active")
            .select("id")
            .maybeSingle();
          // Record a platform-revenue transaction only on the first activation.
          if (promoRow) {
            await recordTransaction({
              event_id: event.id,
              user_id: userId,
              amount,
              amount_cents: amountCents,
              type: "promotion",
              fee_platform_cents: amountCents,
            });
          }
          break;
        }

        // Product purchase: create the order once (idempotent on session id)
        // and decrement stock. Clients never write orders — only this webhook.
        if (productId && recipientId) {
          const { data: existing } = await supabase
            .from("orders")
            .select("id")
            .eq("stripe_session_id", session.id)
            .maybeSingle();
          if (!existing) {
            const { error: orderErr } = await supabase.from("orders").insert({
              buyer_id: userId,
              product_id: productId,
              seller_id: recipientId,
              amount_cents: amountCents,
              platform_fee_cents: feeCents,
              status: "paid",
              stripe_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
            });
            if (orderErr) {
              console.error("order insert:", orderErr);
            } else {
              const { error: decErr } = await supabase.rpc("decrement_stock", {
                p_product_id: productId,
              });
              if (decErr) console.error("decrement_stock:", decErr);
              // Первичная обработка (order вставлен) — уведомляем продавца.
              await notifyUser(recipientId, "payment_received", {
                amount,
                currency: "EUR",
                dealId: "",
              });
            }
          }
        }

        // Cart purchase: one order for the whole cart (idempotent on session id)
        // + one order_items row per position, then decrement each product's stock.
        if (type === "cart_purchase" && recipientId) {
          let ids: string[] = [];
          try {
            ids = JSON.parse(md.productIds || "[]");
          } catch {
            ids = [];
          }
          if (ids.length > 0) {
            const { data: existing } = await supabase
              .from("orders")
              .select("id")
              .eq("stripe_session_id", session.id)
              .maybeSingle();
            if (!existing) {
              const { data: order, error: orderErr } = await supabase
                .from("orders")
                .insert({
                  buyer_id: userId,
                  product_id: ids[0], // orders.product_id is NOT NULL — use first as representative
                  seller_id: recipientId,
                  amount_cents: amountCents,
                  platform_fee_cents: feeCents,
                  status: "paid",
                  stripe_session_id: session.id,
                  stripe_payment_intent_id: paymentIntentId,
                })
                .select("id")
                .single();
              if (orderErr) {
                console.error("cart order insert:", orderErr);
              } else if (order) {
                const { data: prods } = await supabase
                  .from("products")
                  .select("id, price_cents")
                  .in("id", ids);
                const priceMap = new Map(
                  (prods || []).map((p: { id: string; price_cents: number }) => [p.id, p.price_cents])
                );
                for (const pid of ids) {
                  const { error: itemErr } = await supabase.from("order_items").insert({
                    order_id: order.id,
                    product_id: pid,
                    price_cents: priceMap.get(pid) ?? 0,
                  });
                  if (itemErr) console.error("order_items insert:", itemErr);
                  const { error: decErr } = await supabase.rpc("decrement_stock", {
                    p_product_id: pid,
                  });
                  if (decErr) console.error("decrement_stock:", decErr);
                }
              }
            }
          }
        }

        // Stream donation: bump the host's raised total.
        if (streamId && paymentIntentId) {
          const { error: incErr } = await supabase.rpc("increment_stream_raised", {
            p_stream_id: streamId,
            p_amount: amount,
          });
          if (incErr) console.error("increment_stream_raised:", incErr);
        }

        // recordTransaction возвращает false на дубле события (UNIQUE) — это наш
        // маркер первичности для отправки писем (не спамим на ретраях webhook).
        const firstTime = await recordTransaction({
          event_id: event.id,
          user_id: userId,
          deal_id: dealId,
          amount,
          amount_cents: amountCents,
          type,
          payment_intent_id: paymentIntentId,
          fee_platform_cents: feeCents,
        });

        // Recipient-side mirror entry — separate event_id, separate idempotency.
        if (dealId && recipientId) {
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

        // Транзакционные письма получателю средств — только при первичной
        // обработке (firstTime). Спонсору/покупателю не шлём, чтобы не спамить.
        if (firstTime) {
          if (dealId && recipientId) {
            // deal paid → уведомляем получателя (creator).
            await notifyUser(recipientId, "payment_received", {
              amount,
              currency: "EUR",
              dealId,
            });
          } else if (streamId && recipientId) {
            // stream donation → уведомляем хоста (recipient_id).
            await notifyUser(recipientId, "payment_received", {
              amount,
              currency: "EUR",
              dealId: "",
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
        break;
    }
  } catch (err: unknown) {
    console.error("webhook handler error:", err);
    return new Response("handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
