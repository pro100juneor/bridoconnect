import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// dLocal webhook (Smart Notifications).
// Events: PAID, REJECTED, REFUNDED, CHARGEBACK.
// HMAC SHA-256 signature in X-Signature header, key = DLOCAL_SECRET.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

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

type DlocalEvent = {
  id: string;
  status: "PAID" | "REJECTED" | "REFUNDED" | "CHARGEBACK" | "PENDING";
  status_code: string;
  amount: number;
  currency: string;
  order_id: string;
  country: string;
  additional_information?: {
    deal_id?: string;
    sponsor_id?: string;
    recipient_id?: string;
  };
};

serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get("x-signature") || "";
  const secret = Deno.env.get("DLOCAL_SECRET") || "";
  if (!secret) return new Response("missing secret", { status: 500 });

  const computed = await hmacHex(secret, body);
  if (computed !== sig) {
    return new Response("invalid signature", { status: 400 });
  }

  let event: DlocalEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const meta = event.additional_information || {};
  const dealId = meta.deal_id || null;
  const sponsorId = meta.sponsor_id || null;

  try {
    if (event.status === "PAID" && dealId) {
      // Atomic + idempotent via apply_dlocal_payment.
      const { error: applyErr } = await supabase.rpc("apply_dlocal_payment", {
        p_deal_id: dealId,
        p_amount: event.amount,
        p_payment_id: event.id,
        p_sponsor_id: sponsorId,
      });
      if (applyErr) throw applyErr;

      await supabase.from("transactions").insert({
        processor: "dlocal",
        dlocal_payment_id: event.id,
        user_id: sponsorId || "",
        deal_id: dealId,
        amount: event.amount,
        amount_cents: Math.round(event.amount * 100),
        type: "deal_payment",
        status: "completed",
      });
    } else if (event.status === "REFUNDED" && dealId) {
      await supabase.from("transactions").insert({
        processor: "dlocal",
        dlocal_payment_id: event.id,
        user_id: sponsorId || "",
        deal_id: dealId,
        amount: event.amount,
        amount_cents: Math.round(event.amount * 100),
        type: "refund",
        status: "completed",
      });
      await supabase
        .from("deals")
        .update({
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", dealId);
    } else if (event.status === "CHARGEBACK" && dealId) {
      await supabase
        .from("deals")
        .update({
          status: "disputed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", dealId);
    }
  } catch (err) {
    console.error("dlocal handler error:", err);
    return new Response("handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});
