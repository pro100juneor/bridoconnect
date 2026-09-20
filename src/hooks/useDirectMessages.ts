import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

// Resolve (or create) the DM thread between the current user and `targetUserId`.
// Backed by the security-definer RPC, so the sorted pair and uniqueness are
// handled server-side. Returns the thread id, or null on failure.
export const openDirectThread = async (targetUserId: string): Promise<string | null> => {
  const { data, error } = await supabase.rpc("get_or_create_dm_thread", { target: targetUserId });
  if (error || !data) return null;
  return data as string;
};

export const markDirectThreadRead = async (threadId: string, userId: string) => {
  if (!threadId || !userId) return;
  await supabase
    .from("direct_reads")
    .upsert({ user_id: userId, thread_id: threadId, last_read_at: new Date().toISOString() });
};

export const useDirectMessages = (threadId: string | null) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    supabase
      .from("direct_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        if (!error && data) setMessages(data as DirectMessage[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`direct_messages_${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const next = payload.new as DirectMessage;
          setMessages((prev) => (prev.some((m) => m.id === next.id) ? prev : [...prev, next]));
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  const sendMessage = async (text: string, senderId: string) => {
    if (!threadId || !text.trim()) return { error: "Invalid params" };
    const { data, error } = await supabase
      .from("direct_messages")
      .insert([{ thread_id: threadId, sender_id: senderId, text: text.trim() }])
      .select()
      .single();
    return { data, error };
  };

  return { messages, loading, sendMessage };
};
