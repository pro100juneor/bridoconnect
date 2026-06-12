import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// PayPal webhook handler.
// События: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.REFUNDED,
// CHECKOUT.ORDER.APPROVED, MERCHANT.ONBOARDING.COMPLETED.

const PAYPAL_BASE =
  Deno.env.get("PAYPAL_ENV") === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

async function verifyWebhook(headers: Headers, body: string): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID") || "";
  if (!webhookId) return false;
  const id = Deno.env.get("PAYPAL_CLIENT_ID") || "";
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
  const basic = btoa(`${id}:${secret}`);
  const tokenResp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const { access_token } = await tokenResp.json();
  const verify = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });
  const { verification_status } = await verify.json();
  return verification_status === "SUCCESS";
}

async function recordPaypalTx(row: {
  event_id: string;
  user_id: string;
  deal_id?: string | null;
  amount: number;
  amount_cents: number;
  type: string;
  status?: string;
  capture_id?: string | null;
}): Promise<boolean> {
  const { error } = await supabase.from("transactions").insert({
    processor: "paypal",
    paypal_event_id: row.event_id,
    paypal_capture_id: row.capture_id ?? null,
    user_id: row.user_id,
    deal_id: row.deal_id ?? null,
    amount: row.amount,
    amount_cents: row.amount_cents,
    type: row.type,
    status: row.status ?? "completed",
  });
  if (error) {
    if ((error as { code?: string }).code === "23505") return false;
    console.error("paypal recordTx:", error);
    throw error;
  }
  return true;
}

serve(async (req) => {
  const body = await req.text();
  const verified = await verifyWebhook(req.headers, body);
  if (!verified) {
    return new Response("invalid signature", { status: 400 });
  }

  type PaypalEvent = {
    id: string;
    event_type: string;
    resource: Record<string, unknown>;
  };
  const event: PaypalEvent = JSON.parse(body);

  try {
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED": {
        const r = event.resource as {
          id: string;
          amount: { value: string };
          custom_id?: string;
          supplementary_data?: { related_ids?: { order_id?: string } };
        };
        const customId = r.custom_id ? JSON.parse(r.custom_id) : {};
        const amount = Number(r.amount.value);
        const cents = Math.round(amount * 100);

        const inserted = await recordPaypalTx({
          event_id: event.id,
          user_id: customId.user_id || "",
          deal_id: customId.deal_id || null,
          amount,
          amount_cents: cents,
          type: "deal_payment",
          capture_id: r.id,
        });
        if (!inserted) break;

        if (customId.deal_id) {
          await supabase.rpc("increment_raised", { deal_id: customId.deal_id, amount });
          await supabase
            .from("deals")
            .update({
              paypal_capture_id: r.id,
              paypal_order_id: r.supplementary_data?.related_ids?.order_id || null,
              sponsor_id: customId.user_id,
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", customId.deal_id);
        }
        break;
      }

      case "PAYMENT.CAPTURE.REFUNDED": {
        const r = event.resource as {
          id: string;
          amount: { value: string };
          links?: Array<{ rel: string; href: string }>;
        };
        const captureLink = r.links?.find((l) => l.rel === "up")?.href;
        const captureId = captureLink?.split("/").pop();
        if (!captureId) break;
        const { data: deal } = await supabase
          .from("deals")
          .select("id, sponsor_id")
          .eq("paypal_capture_id", captureId)
          .maybeSingle();
        if (!deal) break;
        const amount = Number(r.amount.value);
        await recordPaypalTx({
          event_id: event.id,
          user_id: deal.sponsor_id || "",
          deal_id: deal.id,
          amount,
          amount_cents: Math.round(amount * 100),
          type: "refund",
          capture_id: captureId,
        });
        await supabase
          .from("deals")
          .update({
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", deal.id);
        break;
      }

      case "MERCHANT.ONBOARDING.COMPLETED": {
        const r = event.resource as { merchant_id?: string; tracking_id?: string };
        if (r.merchant_id) {
          await supabase
            .from("profiles")
            .update({
              paypal_merchant_id: r.merchant_id,
              paypal_status: "active",
              paypal_updated_at: new Date().toISOString(),
            })
            .eq("id", r.tracking_id || "");
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("paypal webhook error:", err);
    return new Response("handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
