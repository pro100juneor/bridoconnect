import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// BTCPay Server webhook. Events: InvoiceSettled, InvoiceExpired, InvoiceInvalid.
// HMAC SHA-256 в BTCPay-Sig header, key = BTCPAY_WEBHOOK_SECRET.

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

type BtcpayEvent = {
  deliveryId: string;
  webhookId: string;
  originalDeliveryId: string;
  isRedelivery: boolean;
  type: "InvoiceSettled" | "InvoiceExpired" | "InvoiceInvalid" | "InvoiceCreated";
  timestamp: number;
  storeId: string;
  invoiceId: string;
  metadata?: {
    deal_id?: string;
    sponsor_id?: string;
    recipient_id?: string;
  };
  payment?: {
    value: string; // crypto amount
    fiat?: string; // EUR value at settlement time
    paymentMethod: string;
    paymentMethodPaid: string;
    destination: string;
    txid?: string;
  };
};

serve(async (req) => {
  const body = await req.text();
  const sigHeader = req.headers.get("btcpay-sig") || "";
  const secret = Deno.env.get("BTCPAY_WEBHOOK_SECRET") || "";
  if (!secret) return new Response("missing secret", { status: 500 });

  // BTCPay-Sig format: "sha256=<hex>"
  const expected = "sha256=" + (await hmacHex(secret, body));
  if (expected !== sigHeader) {
    return new Response("invalid signature", { status: 400 });
  }

  let event: BtcpayEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const meta = event.metadata || {};
  const dealId = meta.deal_id || null;
  const sponsorId = meta.sponsor_id || null;

  try {
    if (event.type === "InvoiceSettled" && dealId) {
      const fiatAmount = Number(event.payment?.fiat || 0);
      const { error: applyErr } = await supabase.rpc("apply_crypto_payment", {
        p_deal_id: dealId,
        p_amount: fiatAmount,
        p_invoice_id: event.invoiceId,
        p_sponsor_id: sponsorId,
        p_currency: event.payment?.paymentMethod || "BTC",
      });
      if (applyErr) throw applyErr;

      await supabase.from("transactions").insert({
        processor: "crypto",
        crypto_invoice_id: event.invoiceId,
        crypto_tx_hash: event.payment?.txid || null,
        user_id: sponsorId || "",
        deal_id: dealId,
        amount: fiatAmount,
        amount_cents: Math.round(fiatAmount * 100),
        type: "deal_payment",
        status: "completed",
      });
    } else if (event.type === "InvoiceExpired" && dealId) {
      // Invoice истёк без оплаты — просто логируем, deal остаётся открытым.
      console.log("btcpay invoice expired:", event.invoiceId);
    } else if (event.type === "InvoiceInvalid" && dealId) {
      console.warn("btcpay invoice invalid:", event.invoiceId);
    }
  } catch (err) {
    console.error("btcpay handler error:", err);
    return new Response("handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});
