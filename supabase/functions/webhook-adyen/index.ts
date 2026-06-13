import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Adyen webhook (notifications). События приходят пачками в notificationItems[].
// HMAC validation по additionalData.hmacSignature + HMAC_KEY hex.
// Audit fix P0-2: escape \ и : в каждом поле sign-string (Adyen requirement).
// Audit fix P0-3: тянуть sponsor_id из deal по merchantReference (не "").

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

// Adyen HMAC spec: each field must be escaped — backslash first, then colon.
// Order matters: \ → \\ then : → \: (otherwise the original \ gets the new \: escaped).
function adyenEscape(field: string): string {
  return field.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
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
  const fields = [
    notif.pspReference,
    notif.additionalData?.originalReference || "",
    notif.additionalData?.merchantAccountCode || "",
    notif.merchantReference || "",
    String(notif.amount?.value ?? ""),
    notif.amount?.currency || "",
    notif.eventCode,
    notif.success,
  ].map(adyenEscape);
  const signStr = fields.join(":");
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

      // P0-3 fix: lookup sponsor_id from deal to attribute the transaction correctly.
      let sponsorId = "";
      if (dealId) {
        const { data: deal } = await supabase
          .from("deals")
          .select("sponsor_id")
          .eq("id", dealId)
          .maybeSingle();
        sponsorId = deal?.sponsor_id || "";
      }

      const { error } = await supabase.from("transactions").insert({
        processor: "adyen",
        adyen_psp_reference: n.pspReference,
        adyen_event_code: n.eventCode,
        user_id: sponsorId,
        deal_id: dealId,
        amount,
        amount_cents: cents,
        type: n.eventCode === "REFUND" ? "refund" : "deal_payment",
        status: "completed",
      });
      if (error && (error as { code?: string }).code !== "23505") throw error;

      if (n.eventCode === "AUTHORISATION" && dealId) {
        // P1-12 fix: idempotent increment — gates by transaction-existence.
        await supabase.rpc("increment_raised_idempotent", {
          p_deal_id: dealId,
          p_amount: amount,
          p_processor: "adyen",
          p_event_id: n.pspReference,
        });
        await supabase
          .from("deals")
          .update({
            payment_processor: "adyen",
            sponsor_id: sponsorId || null,
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

  return new Response("[accepted]", { status: 200 });
});
