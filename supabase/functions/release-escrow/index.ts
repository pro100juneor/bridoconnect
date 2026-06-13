import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const ALLOWED_ORIGINS = new Set([
  "https://bridoconnect.vercel.app",
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
// - stripe: destination-charge — transfer уже произошёл на capture, мы лишь
//   фиксируем completion + проверяем что charge не зарефанжен (P1-15 fix).
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
      const t = charge?.transfer as string | Stripe.Transfer | null;
      transferId = typeof t === "string" ? t : (t?.id ?? null);
    } else if (deal.payment_processor === "paypal") {
      if (!deal.paypal_capture_id) {
        return new Response(JSON.stringify({ error: "no paypal capture on deal" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      // PayPal split с DELAYED_DISBURSEMENT — disbursement release делается на
      // стороне PayPal автоматически по истечении hold-периода или явно через
      // /v2/payments/captures/<id>/release. Implement when partner-fee credentials
      // are wired; for now just mark completed.
      transferId = deal.paypal_capture_id;
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
