import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type StreamToken = {
  token: string;
  ws_url: string;
  room_name: string;
  participant_name: string;
};

// Mints a LiveKit JWT via the `create-stream-token` edge function.
// Server contract (snake_case): { room_name, is_host } → { token, ws_url, ... }.
// StartStream + StreamViewer call this; both need a `loading` flag for UI.
export const useLiveKit = () => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const [loading, setLoading] = useState(false);

  const getStreamToken = async (
    roomName: string,
    isHost = false,
  ): Promise<StreamToken | null> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-stream-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ room_name: roomName, is_host: isHost }),
      });

      if (!resp.ok) return null;
      return (await resp.json()) as StreamToken;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getStreamToken, loading };
};
