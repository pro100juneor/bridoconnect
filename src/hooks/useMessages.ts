import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/integrations/supabase/types";

export const useMessages = (dealId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealId) { setLoading(false); return; }

    // Завантажуємо існуючі повідомлення
    supabase.from("messages")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setMessages(data as unknown as Message[]);
        setLoading(false);
      });

    // Realtime підписка на нові повідомлення
    const channel = supabase
      .channel(`messages_${dealId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `deal_id=eq.${dealId}` },
        (payload) => {
          setMessages(prev => {
            // Уникаємо дублікатів
            const exists = prev.find(m => m.id === (payload.new as Message).id);
            if (exists) return prev;
            return [...prev, payload.new as unknown as Message];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dealId]);

  const sendMessage = async (text: string, senderId: string) => {
    if (!dealId || !text.trim()) return { error: "Invalid params" };
    const { data, error } = await supabase
      .from("messages")
      .insert([{ deal_id: dealId, sender_id: senderId, text: text.trim() }])
      .select()
      .single();
    return { data, error };
  };

  return { messages, loading, sendMessage };
};
