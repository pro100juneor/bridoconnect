import { supabase } from "@/integrations/supabase/client";

export type ConnectStatus = {
  has_account: boolean;
  status: "none" | "pending" | "enabled" | "restricted" | "rejected";
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements_due: string[];
  country?: string;
};

export const useStripe = () => {
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

  const createCheckout = async ({ amount, dealId }: { amount: number; dealId?: string }) => {
    const resp = await authedFetch("create-checkout", {
      amount,
      dealId,
      type: dealId ? "deal_payment" : "deposit",
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message || err.error || "Stripe error");
    }
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  const createSubscription = async ({ priceId }: { priceId: string }) => {
    const resp = await authedFetch("create-checkout", { type: "subscription", priceId });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Stripe subscription error");
    }
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  const connectOnboard = async (country?: string) => {
    const resp = await authedFetch("connect-onboard", { country });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Stripe Connect error");
    }
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  const fetchConnectStatus = async (): Promise<ConnectStatus> => {
    const resp = await authedFetch("connect-status", {});
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Stripe status error");
    }
    return resp.json();
  };

  const releaseEscrow = async (dealId: string) => {
    const resp = await authedFetch("release-escrow", { dealId });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Escrow release error");
    }
    return resp.json();
  };

  return { createCheckout, createSubscription, connectOnboard, fetchConnectStatus, releaseEscrow };
};
