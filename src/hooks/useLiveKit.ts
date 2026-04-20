import { supabase } from "@/integrations/supabase/client";

export const useLiveKit = () => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const getStreamToken = async (roomName: string): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-stream-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ roomName }),
      });

      if (!resp.ok) return null;
      const { token: lkToken } = await resp.json();
      return lkToken;
    } catch {
      return null;
    }
  };

  return { getStreamToken };
};
