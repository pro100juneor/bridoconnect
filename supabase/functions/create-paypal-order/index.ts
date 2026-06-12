import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYPAL_BASE =
  Deno.env.get("PAYPAL_ENV") === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

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

async function paypalAccessToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID") || "";
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
  const basic = btoa(`${id}:${secret}`);
  const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) throw new Error(`paypal token: ${resp.status}`);
  const json = await resp.json();
  return json.access_token;
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

    const { amount, dealId } = await req.json();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < MIN_EUR || amt > MAX_EUR) {
      return new Response(JSON.stringify({ error: `amount must be ${MIN_EUR}-${MAX_EUR} EUR` }), {
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
    if (!deal) {
      return new Response(JSON.stringify({ error: "deal not found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { data: recipient } = await supabase
      .from("profiles")
      .select("paypal_merchant_id, paypal_status")
      .eq("id", deal.creator_id)
      .maybeSingle();
    if (!recipient?.paypal_merchant_id || recipient.paypal_status !== "active") {
      return new Response(
        JSON.stringify({
          error: "recipient_not_onboarded",
          message: "Recipient has not connected PayPal",
        }),
        { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const token = await paypalAccessToken();
    const feeEur = ((amt * PLATFORM_FEE_BPS) / 10_000).toFixed(2);

    const orderResp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Partner-Attribution-Id": Deno.env.get("PAYPAL_BN_CODE") || "BRIDOCONNECT_SP",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: dealId,
            amount: {
              currency_code: "EUR",
              value: amt.toFixed(2),
              breakdown: {
                item_total: { currency_code: "EUR", value: amt.toFixed(2) },
              },
            },
            payee: { merchant_id: recipient.paypal_merchant_id },
            payment_instruction: {
              disbursement_mode: "DELAYED", // platform releases via capture-paypal-order
              platform_fees: [
                {
                  amount: { currency_code: "EUR", value: feeEur },
                },
              ],
            },
            custom_id: JSON.stringify({ deal_id: dealId, user_id: user.id }),
          },
        ],
      }),
    });
    if (!orderResp.ok) {
      const err = await orderResp.text();
      throw new Error(`paypal order: ${orderResp.status} ${err}`);
    }
    const order = await orderResp.json();

    await supabase
      .from("deals")
      .update({
        paypal_order_id: order.id,
      })
      .eq("id", dealId);

    const approveUrl = order.links?.find((l: { rel: string; href: string }) => l.rel === "approve")?.href;
    return new Response(JSON.stringify({ orderId: order.id, url: approveUrl }), {
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
