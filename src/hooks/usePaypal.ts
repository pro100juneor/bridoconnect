import { supabase } from "@/integrations/supabase/client";

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
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message || err.error || "PayPal error");
    }
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  const onboardPaypal = async () => {
    const resp = await authedFetch("connect-paypal-onboard", {});
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "PayPal onboard error");
    }
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  return { createOrder, onboardPaypal };
};
