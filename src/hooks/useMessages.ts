import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/integrations/supabase/types";

export const useMessages = (dealId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealId) return;

    supabase
      .from("messages")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setMessages(data as unknown as Message[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`messages:${dealId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `deal_id=eq.${dealId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as unknown as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dealId]);

  const sendMessage = async (text: string, senderId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .insert([{ deal_id: dealId, sender_id: senderId, text }])
      .select()
      .single();
    return { data, error };
  };

  return { messages, loading, sendMessage };
};
