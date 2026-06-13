import { supabase } from "@/integrations/supabase/client";

export type KycLevel = "basic-kyc-level" | "enhanced-kyc-level";

export type KycSession = {
  applicantId: string;
  token: string;
  level: string;
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

export const useKyc = () => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const triggerKyc = async (level: KycLevel = "basic-kyc-level"): Promise<KycSession> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/kyc-trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ level }),
    });
    if (!resp.ok) throw new Error(await safeJsonError(resp, "KYC error"));
    return resp.json();
  };

  return { triggerKyc };
};
