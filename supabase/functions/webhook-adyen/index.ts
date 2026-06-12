import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Adyen webhook (notifications). События приходят пачками в notificationItems[].
// HMAC validation по additionalData.hmacSignature + HMAC_KEY hex.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

function hex2bytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function hmacSha256(key: Uint8Array, msg: string): Promise<string> {
  const ck = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", ck, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

type AdyenNotif = {
  pspReference: string;
  eventCode: string;
  success: "true" | "false";
  amount?: { value: number; currency: string };
  merchantReference?: string;
  additionalData?: Record<string, string>;
  reason?: string;
};

async function verifyHmac(notif: AdyenNotif): Promise<boolean> {
  const hmacKey = Deno.env.get("ADYEN_HMAC_KEY") || "";
  if (!hmacKey) return false;
  const sig = notif.additionalData?.hmacSignature;
  if (!sig) return false;
  // Sign string = pspReference:originalReference:merchantAccountCode:merchantReference:
  //               amount.value:amount.currency:eventCode:success
  const orig = notif.additionalData?.originalReference || "";
  const merchAcc = notif.additionalData?.merchantAccountCode || "";
  const signStr = [
    notif.pspReference,
    orig,
    merchAcc,
    notif.merchantReference || "",
    String(notif.amount?.value ?? ""),
    notif.amount?.currency || "",
    notif.eventCode,
    notif.success,
  ].join(":");
  const computed = await hmacSha256(hex2bytes(hmacKey), signStr);
  return computed === sig;
}

serve(async (req) => {
  const body = await req.json();
  const items: Array<{ NotificationRequestItem: AdyenNotif }> = body.notificationItems || [];

  for (const wrap of items) {
    const n = wrap.NotificationRequestItem;
    if (!(await verifyHmac(n))) {
      console.warn("hmac mismatch for", n.pspReference);
      continue;
    }
    if (n.success !== "true") continue;

    try {
      const cents = n.amount?.value || 0;
      const amount = cents / 100;
      const dealId = n.merchantReference || null;

      const { error } = await supabase.from("transactions").insert({
        processor: "adyen",
        adyen_psp_reference: n.pspReference,
        adyen_event_code: n.eventCode,
        user_id: "",
        deal_id: dealId,
        amount,
        amount_cents: cents,
        type: n.eventCode === "REFUND" ? "refund" : "deal_payment",
        status: "completed",
      });
      if (error && (error as { code?: string }).code !== "23505") throw error;

      if (n.eventCode === "AUTHORISATION" && dealId) {
        await supabase.rpc("increment_raised", { deal_id: dealId, amount });
        await supabase
          .from("deals")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", dealId);
      } else if (n.eventCode === "REFUND" && dealId) {
        await supabase
          .from("deals")
          .update({
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", dealId);
      }
    } catch (err) {
      console.error("adyen handler error:", err);
    }
  }

  // Adyen REQUIRES this exact body string to ack and stop retries.
  return new Response("[accepted]", { status: 200 });
});
