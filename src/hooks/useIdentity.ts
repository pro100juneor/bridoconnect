import { supabase } from "@/integrations/supabase/client";

// Stripe Identity: сесія створюється на бекенді (create-identity-session),
// користувач проходить перевірку на hosted-сторінці Stripe. Сирі документи
// до нас не потрапляють — статус приходить через stripe-webhook.

export type IdentitySession = { url: string; sessionId: string };
export type VerificationStatus = "unverified" | "pending" | "verified";

async function safeJsonError(resp: Response, fallback: string): Promise<string> {
  try {
    const j = await resp.json();
    return j.error || j.message || fallback;
  } catch {
    return fallback;
  }
}

export const useIdentity = () => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const createSession = async (): Promise<IdentitySession> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Потрібен вхід в акаунт");
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-identity-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ returnUrl: "https://bridoconnect.vercel.app/verification?done=1" }),
    });
    if (!resp.ok) throw new Error(await safeJsonError(resp, "Не вдалося створити сесію верифікації"));
    return resp.json();
  };

  const getStatus = async (): Promise<VerificationStatus> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "unverified";
    const { data } = await supabase
      .from("profiles")
      .select("verification_status")
      .eq("id", user.id)
      .maybeSingle();
    return ((data as { verification_status?: string } | null)?.verification_status ??
      "unverified") as VerificationStatus;
  };

  return { createSession, getStatus };
};
