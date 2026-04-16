import { supabase } from "@/integrations/supabase/client";

export const useStripe = () => {
  const createCheckout = async ({
    dealId,
    amount,
    currency = "eur",
  }: {
    dealId?: string;
    amount: number;
    currency?: string;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ deal_id: dealId, amount, currency }),
      }
    );

    const { url, error } = await response.json();
    if (error) throw new Error(error);
    if (url) window.location.href = url;
  };

  const createSubscription = async (priceId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ mode: "subscription", price_id: priceId }),
      }
    );

    const { url, error } = await response.json();
    if (error) throw new Error(error);
    if (url) window.location.href = url;
  };

  return { createCheckout, createSubscription };
};
