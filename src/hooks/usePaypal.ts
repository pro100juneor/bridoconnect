import { supabase } from "@/integrations/supabase/client";

// P0-6 fix shared with useStripe.
async function safeJsonError(resp: Response, fallback: string): Promise<string> {
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const j = await resp.json();
      return j.message || j.error || fallback;
    } catch {
      // fall through
    }
  }
  try {
    const text = await resp.text();
    return text.slice(0, 200) || fallback;
  } catch {
    return fallback;
  }
}

export const usePaypal = () => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const authedFetch = async (path: string, body: unknown) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  };

  const createOrder = async ({ amount, dealId }: { amount: number; dealId: string }) => {
    const resp = await authedFetch("create-paypal-order", { amount, dealId });
    if (!resp.ok) throw new Error(await safeJsonError(resp, "PayPal error"));
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  const onboardPaypal = async () => {
    const resp = await authedFetch("connect-paypal-onboard", {});
    if (!resp.ok) throw new Error(await safeJsonError(resp, "PayPal onboard error"));
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  // Called on return from PayPal approval to capture the order. Payment is then
  // recorded onto the deal idempotently by webhook-paypal. (Rail gated OFF in UI
  // until sandbox-verified.)
  const captureOrder = async ({ orderId, dealId }: { orderId?: string; dealId?: string }) => {
    const resp = await authedFetch("capture-paypal-order", { orderId, dealId });
    if (!resp.ok) throw new Error(await safeJsonError(resp, "PayPal capture error"));
    return resp.json();
  };

  return { createOrder, onboardPaypal, captureOrder };
};
