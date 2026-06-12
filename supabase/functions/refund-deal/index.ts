import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Universal refund — ветвится по deal.payment_processor.
// Rules: only sponsor can initiate, only within 14d window AND escrow not yet released.
// Audit P0-1 pattern: caller_id checked explicitly (no auth.uid() reliance).

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const PAYPAL_BASE =
  Deno.env.get("PAYPAL_ENV") === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const ADYEN_BASE =
  Deno.env.get("ADYEN_ENV") === "live"
    ? "https://checkout-live.adyen.com"
    : "https://checkout-test.adyen.com";
const DLOCAL_BASE =
  Deno.env.get("DLOCAL_ENV") === "live" ? "https://api.dlocal.com" : "https://sandbox.dlocal.com";

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

const REFUND_WINDOW_DAYS = 14;

async function paypalToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID") || "";
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
  const basic = btoa(`${id}:${secret}`);
  const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) throw new Error(`paypal oauth: ${resp.status}`);
  return (await resp.json()).access_token;
}

async function hmacHex(secret: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

    const { dealId, reason } = await req.json();
    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { data: deal } = await supabase
      .from("deals")
      .select(
        "id, sponsor_id, status, payment_processor, stripe_payment_intent_id, paypal_capture_id, adyen_psp_reference, dlocal_payment_id, amount_cents, escrow_released_at, refunded_at, created_at, updated_at"
      )
      .eq("id", dealId)
      .maybeSingle();
    if (!deal) {
      return new Response(JSON.stringify({ error: "deal not found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const isAdmin = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => data?.role === "admin");

    if (!isAdmin && deal.sponsor_id !== user.id) {
      return new Response(JSON.stringify({ error: "only sponsor or admin may refund" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (deal.refunded_at) {
      return new Response(JSON.stringify({ ok: true, already: true }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (deal.escrow_released_at) {
      return new Response(JSON.stringify({ error: "escrow already released" }), {
        status: 409,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Refund window: 14 days from updated_at (last payment event) unless admin.
    if (!isAdmin) {
      const ageDays = (Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > REFUND_WINDOW_DAYS) {
        return new Response(JSON.stringify({ error: `refund window expired (${REFUND_WINDOW_DAYS}d)` }), {
          status: 409,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
    }

    let refundId: string | null = null;
    const processor = deal.payment_processor || "stripe";

    if (processor === "stripe") {
      if (!deal.stripe_payment_intent_id) throw new Error("no PI on deal");
      const refund = await stripe.refunds.create({
        payment_intent: deal.stripe_payment_intent_id,
        reason: "requested_by_customer",
        metadata: { deal_id: dealId, initiated_by: user.id, refund_reason: reason || "" },
      });
      refundId = refund.id;
    } else if (processor === "paypal") {
      if (!deal.paypal_capture_id) throw new Error("no PayPal capture");
      const token = await paypalToken();
      const resp = await fetch(`${PAYPAL_BASE}/v2/payments/captures/${deal.paypal_capture_id}/refund`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          note_to_payer: reason || "Refund issued by sponsor",
        }),
      });
      if (!resp.ok) throw new Error(`paypal refund: ${resp.status} ${await resp.text()}`);
      refundId = (await resp.json()).id;
    } else if (processor === "adyen") {
      if (!deal.adyen_psp_reference) throw new Error("no Adyen PSP");
      const resp = await fetch(`${ADYEN_BASE}/v71/payments/${deal.adyen_psp_reference}/refunds`, {
        method: "POST",
        headers: {
          "x-API-key": Deno.env.get("ADYEN_API_KEY") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantAccount: Deno.env.get("ADYEN_MERCHANT_ACCOUNT") || "",
          amount: { value: deal.amount_cents || 0, currency: "EUR" },
          reference: `refund-${dealId}`,
        }),
      });
      if (!resp.ok) throw new Error(`adyen refund: ${resp.status} ${await resp.text()}`);
      refundId = (await resp.json()).pspReference;
    } else if (processor === "dlocal") {
      if (!deal.dlocal_payment_id) throw new Error("no dlocal payment");
      const ts = new Date().toISOString();
      const login = Deno.env.get("DLOCAL_LOGIN") || "";
      const transKey = Deno.env.get("DLOCAL_TRANS_KEY") || "";
      const body = JSON.stringify({
        payment_id: deal.dlocal_payment_id,
        description: reason || "sponsor refund",
      });
      const sig = await hmacHex(Deno.env.get("DLOCAL_SECRET") || "", `${login}${ts}${body}`);
      const resp = await fetch(`${DLOCAL_BASE}/refunds`, {
        method: "POST",
        headers: {
          "X-Date": ts,
          "X-Login": login,
          "X-Trans-Key": transKey,
          Authorization: `V2-HMAC-SHA256, Signature: ${sig}`,
          "Content-Type": "application/json",
        },
        body,
      });
      if (!resp.ok) throw new Error(`dlocal refund: ${resp.status} ${await resp.text()}`);
      refundId = (await resp.json()).id;
    } else if (processor === "crypto") {
      // BTCPay invoice refunds — manual via dashboard (no API for instant on-chain refund).
      return new Response(
        JSON.stringify({
          error: "crypto refunds require manual processing via BTCPay dashboard",
        }),
        { status: 501, headers: { ...headers, "Content-Type": "application/json" } }
      );
    } else {
      throw new Error(`unknown processor: ${processor}`);
    }

    // Mark deal + ledger entry. Webhook will also fire (idempotency на event_id).
    await supabase
      .from("deals")
      .update({
        refunded_at: new Date().toISOString(),
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId);

    await supabase.from("transactions").insert({
      processor,
      stripe_event_id: `refund-init::${dealId}`,
      user_id: deal.sponsor_id || user.id,
      deal_id: dealId,
      amount: (deal.amount_cents || 0) / 100,
      amount_cents: deal.amount_cents,
      type: "refund",
      status: "initiated",
    });

    return new Response(JSON.stringify({ ok: true, refundId, processor }), {
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
