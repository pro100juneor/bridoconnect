import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Adyen Checkout API — создаёт payment session для APAC локальных методов.
// Frontend инициализирует Drop-in с session_id из ответа.

const ADYEN_BASE =
  Deno.env.get("ADYEN_ENV") === "live"
    ? "https://checkout-live.adyen.com"
    : "https://checkout-test.adyen.com";
const ADYEN_API_VERSION = "v71";

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

const MIN_EUR = 1;
const MAX_EUR = 10_000;
const PLATFORM_FEE_BPS = 500;

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

    const { amount, dealId, currency = "EUR", countryCode } = await req.json();
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
      .select("adyen_account_holder_code, adyen_status")
      .eq("id", deal.creator_id)
      .maybeSingle();
    if (!recipient?.adyen_account_holder_code || recipient.adyen_status !== "active") {
      return new Response(
        JSON.stringify({
          error: "recipient_not_onboarded",
          message: "Recipient has not connected Adyen",
        }),
        { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const unitMinor = Math.round(amt * 100);
    const feeMinor = Math.round((unitMinor * PLATFORM_FEE_BPS) / 10_000);
    const reqOrigin = req.headers.get("origin");
    const origin =
      reqOrigin && ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : "https://bridoconnect.vercel.app";

    const sessionResp = await fetch(`${ADYEN_BASE}/${ADYEN_API_VERSION}/sessions`, {
      method: "POST",
      headers: {
        "x-API-key": Deno.env.get("ADYEN_API_KEY") || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merchantAccount: Deno.env.get("ADYEN_MERCHANT_ACCOUNT") || "",
        amount: { currency, value: unitMinor },
        reference: dealId,
        returnUrl: `${origin}/app/deal/${dealId}?adyen=return`,
        countryCode: countryCode || "DE",
        splits: [
          {
            type: "MarketPlace",
            amount: { value: unitMinor - feeMinor },
            account: recipient.adyen_account_holder_code,
            reference: `recipient-${dealId}`,
          },
          {
            type: "Commission",
            amount: { value: feeMinor },
            reference: `platform-fee-${dealId}`,
          },
        ],
        shopperReference: user.id,
        metadata: {
          deal_id: dealId,
          recipient_id: deal.creator_id,
          sponsor_id: user.id,
          platform_fee_minor: String(feeMinor),
        },
      }),
    });
    if (!sessionResp.ok) {
      const err = await sessionResp.text();
      throw new Error(`adyen session: ${sessionResp.status} ${err}`);
    }
    const session = await sessionResp.json();

    await supabase
      .from("deals")
      .update({
        adyen_psp_reference: session.id,
        adyen_merchant_account: Deno.env.get("ADYEN_MERCHANT_ACCOUNT") || null,
      })
      .eq("id", dealId);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        sessionData: session.sessionData,
        clientKey: Deno.env.get("ADYEN_CLIENT_KEY") || "",
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
