import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getStripeConnect } from "../_shared/payment-accounts.ts";
import { sendTransactionalEmail } from "../_shared/email.ts";
import { PAYPAL_BASE, paypalAccessToken } from "../_shared/paypal.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const ALLOWED_ORIGINS = new Set([
  "https://bridoconnect.vercel.app",
  "capacitor://localhost",
  "https://localhost",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
]);

function corsFor(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://bridoconnect.vercel.app";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

// Universal release: ветвится по deal.payment_processor.
// - stripe: separate charges & transfers — деньги лежат на балансе платформы с
//   момента оплаты, и ИМЕННО ЗДЕСЬ уходят получателю через transfers.create.
//   Это и есть настоящий эскроу. Легаси-сделки, оплаченные старым destination
//   charge (у charge уже есть transfer), не переводим повторно — только
//   фиксируем completion.
// - paypal: для DELAYED_DISBURSEMENT нужен capture/release-call. Сейчас
//   реализован shortcut: помечаем deal completed + ledger entry; реальный
//   PayPal disbursement release делается на стороне PayPal Dashboard или
//   через v2/payments/captures/<id>/release endpoint (TODO).
// - adyen: split уже произошёл при capture. Просто mark completed.
//
// P0-1 fix: caller_id передаётся явно в RPC.
// P1-15 fix: проверка charge.refunded перед completion для Stripe.

serve(async (req) => {
  const headers = corsFor(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    const authHeader = req.headers.get("Authorization");
    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader?.replace("Bearer ", "") || "");
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { dealId } = await req.json();
    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { data: deal, error: dErr } = await supabase
      .from("deals")
      .select(
        "id, creator_id, sponsor_id, status, payment_processor, stripe_payment_intent_id, paypal_capture_id, adyen_psp_reference, amount_cents, platform_fee_cents, escrow_released_at"
      )
      .eq("id", dealId)
      .maybeSingle();
    if (dErr || !deal) {
      return new Response(JSON.stringify({ error: "deal not found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (deal.sponsor_id !== user.id) {
      return new Response(JSON.stringify({ error: "only sponsor may release" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (deal.escrow_released_at) {
      return new Response(JSON.stringify({ ok: true, already: true }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    let transferId: string | null = null;

    if (deal.payment_processor === "stripe" || (!deal.payment_processor && deal.stripe_payment_intent_id)) {
      if (!deal.stripe_payment_intent_id) {
        return new Response(JSON.stringify({ error: "no stripe payment intent on deal" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      const pi = await stripe.paymentIntents.retrieve(deal.stripe_payment_intent_id, {
        expand: ["latest_charge"],
      });
      const charge = pi.latest_charge as Stripe.Charge | null;
      // P1-15 fix: don't complete a refunded/cancelled PI.
      if (pi.status === "canceled" || charge?.refunded) {
        return new Response(JSON.stringify({ error: "payment already refunded or cancelled" }), {
          status: 409,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      const existing = charge?.transfer as string | Stripe.Transfer | null;
      if (existing) {
        // Легаси destination charge: перевод получателю уже состоялся при
        // capture. Второй transfer означал бы двойную выплату.
        transferId = typeof existing === "string" ? existing : existing.id;
      } else {
        // Новый поток: деньги на балансе платформы — переводим получателю.
        const recipient = await getStripeConnect(supabase, deal.creator_id);
        if (!recipient.stripe_connect_account_id || recipient.stripe_connect_status !== "enabled") {
          return new Response(
            JSON.stringify({
              error: "recipient_not_onboarded",
              message: "Recipient has not completed Stripe onboarding",
            }),
            { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
          );
        }
        const netCents = (deal.amount_cents || 0) - (deal.platform_fee_cents || 0);
        if (netCents <= 0) {
          return new Response(JSON.stringify({ error: "nothing to transfer" }), {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
          });
        }
        // source_transaction привязывает перевод к конкретному платежу: Stripe
        // сам дожидается доступности этих средств и не даёт уйти в минус по
        // балансу платформы. Идемпотентный ключ защищает от двойного перевода
        // при ретрае запроса.
        const transfer = await stripe.transfers.create(
          {
            amount: netCents,
            currency: (charge?.currency as string) || "eur",
            destination: recipient.stripe_connect_account_id,
            transfer_group: `deal_${dealId}`,
            ...(charge?.id ? { source_transaction: charge.id } : {}),
            metadata: {
              deal_id: dealId,
              recipient_id: deal.creator_id,
              sponsor_id: deal.sponsor_id || "",
              released_by: user.id,
            },
          },
          { idempotencyKey: `release_deal_${dealId}` }
        );
        transferId = transfer.id;
      }
    } else if (deal.payment_processor === "paypal") {
      if (!deal.paypal_capture_id) {
        return new Response(JSON.stringify({ error: "no paypal capture on deal" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      // PayPal Commerce Platform DELAYED disbursement: release the held funds to
      // the recipient via Referenced Payouts, keyed by the capture id.
      // Ref: POST /v1/payments/referenced-payouts-items { reference_id, reference_type }.
      // (Gated OFF in UI until verified against PayPal sandbox.)
      const ppToken = await paypalAccessToken();
      const payoutResp = await fetch(`${PAYPAL_BASE}/v1/payments/referenced-payouts-items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ppToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `release-${deal.paypal_capture_id}`,
        },
        body: JSON.stringify({
          reference_id: deal.paypal_capture_id,
          reference_type: "TRANSACTION_ID",
        }),
      });
      const payoutJson = await payoutResp.json().catch(() => ({}));
      if (!payoutResp.ok) {
        throw new Error(`paypal release: ${payoutResp.status} ${JSON.stringify(payoutJson)}`);
      }
      transferId = payoutJson?.item_id || deal.paypal_capture_id;
    } else if (deal.payment_processor === "adyen") {
      if (!deal.adyen_psp_reference) {
        return new Response(JSON.stringify({ error: "no adyen psp reference on deal" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      // Adyen MarketPlace split — funds already on recipient account at AUTHORISATION.
      transferId = deal.adyen_psp_reference;
    } else {
      return new Response(JSON.stringify({ error: "unknown payment processor" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // P0-1 fix: pass caller_id explicitly, RPC no longer relies on auth.uid().
    const { error: rpcErr } = await supabase.rpc("release_escrow", {
      p_deal_id: dealId,
      p_transfer_id: transferId,
      p_caller_id: user.id,
    });
    if (rpcErr) throw rpcErr;

    const netCents = (deal.amount_cents || 0) - (deal.platform_fee_cents || 0);
    await supabase.from("transactions").insert({
      processor: deal.payment_processor || "stripe",
      stripe_event_id: `release::${dealId}`,
      user_id: deal.creator_id,
      deal_id: dealId,
      amount: netCents / 100,
      amount_cents: netCents,
      type: "escrow_release",
      status: "completed",
      stripe_payment_intent_id: deal.stripe_payment_intent_id,
    });

    // Уведомляем получателя (creator) о разблокировке средств. Email опционален
    // (no-op без RESEND_API_KEY) — не должен ломать основной поток release.
    try {
      const { data: recipient } = await supabase.auth.admin.getUserById(deal.creator_id);
      const to = recipient?.user?.email;
      if (to) {
        await sendTransactionalEmail({
          to,
          template: "escrow_released",
          locale: "uk",
          vars: { amount: netCents / 100, currency: "EUR", dealId },
          userId: deal.creator_id,
          supabase,
        });
      }
    } catch (mailErr) {
      console.error("escrow_released email error:", mailErr);
    }

    return new Response(JSON.stringify({ ok: true, transferId }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
