import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useLiveKit = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStreamToken = async (roomName: string, isHost = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stream-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ room_name: roomName, is_host: isHost }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data as { token: string; ws_url: string; room_name: string; participant_name: string };
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getStreamToken, loading, error };
};
