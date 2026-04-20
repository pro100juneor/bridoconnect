import { supabase } from "@/integrations/supabase/client";

export const useStripe = () => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const createCheckout = async ({ amount, dealId }: { amount: number; dealId?: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ amount, dealId, type: dealId ? "deal_payment" : "deposit" }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Stripe error");
    }

    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  const createSubscription = async ({ priceId }: { priceId: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ type: "subscription", priceId }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Stripe subscription error");
    }

    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  return { createCheckout, createSubscription };
};
