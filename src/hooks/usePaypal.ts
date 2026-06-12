import { supabase } from "@/integrations/supabase/client";

export const usePaypal = () => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const createOrder = async ({ amount, dealId }: { amount: number; dealId: string }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-paypal-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ amount, dealId }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message || err.error || "PayPal error");
    }
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  return { createOrder };
};
