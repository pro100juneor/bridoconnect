import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// dLocal Smart Fields — для emerging markets:
//   - PIX (Brazil), Boleto (BR), OXXO (Mexico), SPEI (MX)
//   - UPI (India), Net Banking (IN)
//   - M-Pesa (Kenya), Mobile Money (Africa)
//
// Endpoint: POST /payments → возвращает redirect_url или PIX QR data.
// Auth: HMAC-подписанные запросы с X-Date, X-Login, X-Trans-Key.

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

const PLATFORM_FEE_BPS = 500;
// dLocal supports per-country currencies. Validate explicitly.
const SUPPORTED = new Set<string>([
  "BRL",
  "MXN",
  "ARS",
  "COP",
  "CLP",
  "PEN", // LatAm
  "INR", // India
  "KES",
  "NGN",
  "ZAR",
  "EGP",
  "GHS", // Africa
  "USD",
  "EUR", // cross-border
]);

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

    const { amount, dealId, currency, country, paymentMethodId } = await req.json();
    if (!SUPPORTED.has(currency)) {
      return new Response(JSON.stringify({ error: `unsupported currency: ${currency}` }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (!country || !/^[A-Z]{2}$/.test(country)) {
      return new Response(JSON.stringify({ error: "country (ISO2) required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return new Response(JSON.stringify({ error: "invalid amount" }), {
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
      .select("dlocal_payee_id, dlocal_status")
      .eq("id", deal.creator_id)
      .maybeSingle();
    if (!recipient?.dlocal_payee_id || recipient.dlocal_status !== "active") {
      return new Response(
        JSON.stringify({
          error: "recipient_not_onboarded",
          message: "Recipient has not connected dLocal",
        }),
        { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const reqOrigin = req.headers.get("origin");
    const origin =
      reqOrigin && ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : "https://bridoconnect.vercel.app";

    const orderId = `brido-${dealId}-${Date.now()}`;
    const body = JSON.stringify({
      amount: amt,
      currency,
      country,
      payment_method_id: paymentMethodId || "PIX", // PIX, BOLETO, OXXO, UPI, MPESA
      payer: { name: user.email || "Sponsor", email: user.email },
      order_id: orderId,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-dlocal`,
      callback_url: `${origin}/app/deal/${dealId}?dlocal=return`,
      // Split: recipient + platform fee.
      additional_information: {
        deal_id: dealId,
        sponsor_id: user.id,
        recipient_id: deal.creator_id,
        platform_fee_bps: String(PLATFORM_FEE_BPS),
      },
    });

    const ts = new Date().toISOString();
    const login = Deno.env.get("DLOCAL_LOGIN") || "";
    const transKey = Deno.env.get("DLOCAL_TRANS_KEY") || "";
    const secret = Deno.env.get("DLOCAL_SECRET") || "";
    const signature = await hmacHex(secret, `${login}${ts}${body}`);

    const resp = await fetch(`${DLOCAL_BASE}/payments`, {
      method: "POST",
      headers: {
        "X-Date": ts,
        "X-Login": login,
        "X-Trans-Key": transKey,
        Authorization: `V2-HMAC-SHA256, Signature: ${signature}`,
        "Content-Type": "application/json",
      },
      body,
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`dlocal payment: ${resp.status} ${err}`);
    }
    const payment = await resp.json();

    await supabase
      .from("deals")
      .update({
        dlocal_payment_id: payment.id,
        dlocal_country: country,
        payment_processor: "dlocal",
      })
      .eq("id", dealId);

    return new Response(
      JSON.stringify({
        paymentId: payment.id,
        redirectUrl: payment.redirect_url, // for hosted checkout
        qrCode: payment.qr_code, // for PIX
        status: payment.status,
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
