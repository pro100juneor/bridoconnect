import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/integrations/supabase/types";

export const useMessages = (dealId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealId) {
      setLoading(false);
      return;
    }

    // MEDIUM: alive-guard — поздний ответ по старому dealId не перезаписывает новый,
    // и realtime-строки, пришедшие во время загрузки, не затираются (merge по id).
    let alive = true;
    supabase
      .from("messages")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        if (!error && data) {
          setMessages((prev) => {
            const ids = new Set((data as unknown as Message[]).map((m) => m.id));
            const extras = prev.filter((m) => !ids.has(m.id));
            return [...(data as unknown as Message[]), ...extras];
          });
        }
        setLoading(false);
      });

    // Realtime підписка на нові повідомлення
    const channel = supabase
      .channel(`messages_${dealId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `deal_id=eq.${dealId}` },
        (payload) => {
          setMessages((prev) => {
            // Уникаємо дублікатів
            const exists = prev.find((m) => m.id === (payload.new as Message).id);
            if (exists) return prev;
            return [...prev, payload.new as unknown as Message];
          });
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [dealId]);

  const sendMessage = async (text: string, senderId: string, attachmentUrl?: string) => {
    if (!dealId || (!text.trim() && !attachmentUrl)) return { error: "Invalid params" };
    const { data, error } = await supabase
      .from("messages")
      .insert([
        { deal_id: dealId, sender_id: senderId, text: text.trim(), attachment_url: attachmentUrl ?? null },
      ])
      .select()
      .single();
    // LOW: показать своё сообщение сразу (realtime-эхо может задержаться); dedup по id.
    if (!error && data) {
      setMessages((prev) =>
        prev.find((m) => m.id === (data as Message).id) ? prev : [...prev, data as unknown as Message]
      );
    }
    return { data, error };
  };

  return { messages, loading, sendMessage };
};
