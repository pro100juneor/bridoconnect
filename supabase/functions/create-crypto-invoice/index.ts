import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// BTCPay Server invoice creation. Supports BTC on-chain + Lightning + altcoins.
// Used for:
//   - Sanctioned regions where card processors are blocked (UA occupied, IR, KP)
//   - Recipients without bank accounts (refugees)
//   - Micropayments via Lightning (sub-€1 donations where Stripe min applies)
//
// BTCPay self-hosted: gives full custody to the recipient, no KYC needed.
// Auth: BTCPAY_API_KEY header to /api/v1/stores/<store-id>/invoices.

const BTCPAY_URL = Deno.env.get("BTCPAY_URL") || "https://btcpay.example.com";

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

const MIN_EUR = 0.01; // Lightning micropayments allowed.
const MAX_EUR = 50_000;

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

    const { amount, dealId, currency = "EUR", method = "BTC-LightningNetwork" } = await req.json();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < MIN_EUR || amt > MAX_EUR) {
      return new Response(JSON.stringify({ error: `amount must be ${MIN_EUR}-${MAX_EUR}` }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("id, creator_id, status")
      .eq("id", dealId)
      .maybeSingle();
    if (!deal || ["completed", "cancelled"].includes(deal.status)) {
      return new Response(JSON.stringify({ error: "deal not available" }), {
        status: 409,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { data: recipient } = await supabase
      .from("profiles")
      .select("crypto_addresses, crypto_enabled")
      .eq("id", deal.creator_id)
      .maybeSingle();
    if (!recipient?.crypto_enabled) {
      return new Response(
        JSON.stringify({
          error: "recipient_not_onboarded",
          message: "Recipient has not enabled crypto donations",
        }),
        { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const reqOrigin = req.headers.get("origin");
    const origin =
      reqOrigin && ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : "https://bridoconnect.vercel.app";
    const storeId = Deno.env.get("BTCPAY_STORE_ID") || "";

    const resp = await fetch(`${BTCPAY_URL}/api/v1/stores/${storeId}/invoices`, {
      method: "POST",
      headers: {
        Authorization: `token ${Deno.env.get("BTCPAY_API_KEY") || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amt,
        currency,
        metadata: {
          deal_id: dealId,
          sponsor_id: user.id,
          recipient_id: deal.creator_id,
        },
        checkout: {
          speedPolicy: "MediumSpeed", // 1 confirmation для on-chain, instant для LN
          paymentMethods: [method], // "BTC", "BTC-LightningNetwork", "USDT_TRC20"
          redirectURL: `${origin}/app/deal/${dealId}?crypto=return`,
          redirectAutomatically: true,
        },
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`btcpay invoice: ${resp.status} ${err}`);
    }
    const invoice = await resp.json();

    await supabase
      .from("deals")
      .update({
        crypto_invoice_id: invoice.id,
        crypto_currency: currency,
        payment_processor: "crypto",
      })
      .eq("id", dealId);

    return new Response(
      JSON.stringify({
        invoiceId: invoice.id,
        checkoutLink: invoice.checkoutLink,
        status: invoice.status,
        expirationTime: invoice.expirationTime,
      }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
