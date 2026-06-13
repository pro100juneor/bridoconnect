import { supabase } from "@/integrations/supabase/client";

export type AdyenSession = {
  sessionId: string;
  sessionData: string;
  clientKey: string;
};

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

export const useAdyen = () => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const createPaymentSession = async ({
    amount,
    dealId,
    currency = "EUR",
    countryCode,
  }: {
    amount: number;
    dealId: string;
    currency?: string;
    countryCode?: string;
  }): Promise<AdyenSession> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-adyen-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ amount, dealId, currency, countryCode }),
    });
    if (!resp.ok) throw new Error(await safeJsonError(resp, "Adyen error"));
    return resp.json();
  };

  return { createPaymentSession };
};
