import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PAYPAL_BASE, paypalAccessToken } from "../_shared/paypal.ts";

// Captures a PayPal order that the buyer approved (the approve-redirect flow does
// NOT auto-capture). Recording the payment onto the deal (raised + capture id) is
// handled idempotently by webhook-paypal on PAYMENT.CAPTURE.COMPLETED, so this
// function only performs the capture and returns its id.
//
// NOTE: gated OFF in the UI until verified end-to-end against PayPal sandbox.

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

    const { orderId, dealId } = await req.json();
    let resolvedOrderId: string | null = orderId ?? null;
    if (!resolvedOrderId && dealId) {
      const { data: deal } = await supabase
        .from("deals")
        .select("paypal_order_id")
        .eq("id", dealId)
        .maybeSingle();
      resolvedOrderId = deal?.paypal_order_id ?? null;
    }
    if (!resolvedOrderId) {
      return new Response(JSON.stringify({ error: "orderId or dealId required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const token = await paypalAccessToken();
    const resp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${resolvedOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // Idempotency: a retry with the same key returns the original result.
        "PayPal-Request-Id": `capture-${resolvedOrderId}`,
      },
    });
    const json = await resp.json().catch(() => ({}));

    // Already captured (e.g. a double return from PayPal) is a success, not an error.
    const alreadyCaptured =
      resp.status === 422 &&
      Array.isArray(json?.details) &&
      json.details.some((d: { issue?: string }) => d.issue === "ORDER_ALREADY_CAPTURED");

    if (!resp.ok && !alreadyCaptured) {
      throw new Error(`paypal capture: ${resp.status} ${JSON.stringify(json)}`);
    }

    const captureId = json?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;

    return new Response(JSON.stringify({ ok: true, orderId: resolvedOrderId, captureId }), {
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
