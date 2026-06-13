import { supabase } from "@/integrations/supabase/client";

export type ConnectStatus = {
  has_account: boolean;
  status: "none" | "pending" | "enabled" | "restricted" | "rejected";
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements_due: string[];
  country?: string;
};

// P0-6 fix: Stripe/Supabase edge gateways return text/html on 502/503. Calling
// .json() on those crashes with cryptic SyntaxError. Guard on content-type.
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

export const useStripe = () => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  if (!SUPABASE_URL) {
    console.error("VITE_SUPABASE_URL is not set — edge function calls will fail");
  }

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

  const createCheckout = async ({ amount, dealId }: { amount: number; dealId?: string }) => {
    const resp = await authedFetch("create-checkout", {
      amount,
      dealId,
      type: dealId ? "deal_payment" : "deposit",
    });
    if (!resp.ok) throw new Error(await safeJsonError(resp, "Stripe error"));
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  const createSubscription = async ({ priceId }: { priceId: string }) => {
    const resp = await authedFetch("create-checkout", { type: "subscription", priceId });
    if (!resp.ok) throw new Error(await safeJsonError(resp, "Stripe subscription error"));
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  const connectOnboard = async (country?: string) => {
    const resp = await authedFetch("connect-onboard", { country });
    if (!resp.ok) throw new Error(await safeJsonError(resp, "Stripe Connect error"));
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  const fetchConnectStatus = async (): Promise<ConnectStatus> => {
    const resp = await authedFetch("connect-status", {});
    if (!resp.ok) throw new Error(await safeJsonError(resp, "Stripe status error"));
    return resp.json();
  };

  const releaseEscrow = async (dealId: string) => {
    const resp = await authedFetch("release-escrow", { dealId });
    if (!resp.ok) throw new Error(await safeJsonError(resp, "Escrow release error"));
    return resp.json();
  };

  const refundDeal = async (dealId: string, reason?: string) => {
    const resp = await authedFetch("refund-deal", { dealId, reason });
    if (!resp.ok) throw new Error(await safeJsonError(resp, "Refund error"));
    return resp.json();
  };

  return {
    createCheckout,
    createSubscription,
    connectOnboard,
    fetchConnectStatus,
    releaseEscrow,
    refundDeal,
  };
};
