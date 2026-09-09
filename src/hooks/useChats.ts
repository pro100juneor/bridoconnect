import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatPreview {
  deal_id: string;
  deal_title: string;
  deal_status: string;
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  other_flag: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface ChatProfileJoin {
  name: string | null;
  avatar_url: string | null;
  country: string | null;
}

interface ChatDealRow {
  id: string;
  title: string;
  status: string;
  creator_id: string;
  sponsor_id: string | null;
  creator: ChatProfileJoin | null;
  sponsor: ChatProfileJoin | null;
}

export const useChats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Підтягую деали, де юзер — creator АБО sponsor
    const { data: deals, error } = await supabase
      .from("deals")
      .select(
        `
        id, title, status, creator_id, sponsor_id,
        creator:profiles!creator_id(name, avatar_url, country),
        sponsor:profiles!sponsor_id(name, avatar_url, country)
      `
      )
      .or(`creator_id.eq.${user.id},sponsor_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (error || !deals) {
      setChats([]);
      setLoading(false);
      return;
    }

    // Позначки прочитаного (chat_reads): deal_id → last_read_at
    const { data: reads } = await supabase
      .from("chat_reads")
      .select("deal_id, last_read_at")
      .eq("user_id", user.id);
    const readMap = new Map<string, string>(
      (reads ?? []).map((r: { deal_id: string; last_read_at: string }) => [r.deal_id, r.last_read_at])
    );

    // Для кожного деалу — останнє повідомлення + кількість непрочитаних
    const previews: ChatPreview[] = await Promise.all(
      deals.map(async (d: ChatDealRow) => {
        const isCreator = d.creator_id === user.id;
        const other = isCreator ? d.sponsor : d.creator;
        const otherId = isCreator ? d.sponsor_id : d.creator_id;

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("text, created_at, sender_id")
          .eq("deal_id", d.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let unread = 0;
        if (lastMsg && lastMsg.sender_id !== user.id) {
          const lastRead = readMap.get(d.id);
          let q = supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("deal_id", d.id)
            .neq("sender_id", user.id);
          if (lastRead) q = q.gt("created_at", lastRead);
          const { count } = await q;
          unread = count ?? 0;
        }

        return {
          deal_id: d.id,
          deal_title: d.title,
          deal_status: d.status,
          other_id: otherId || "",
          other_name: other?.name || "Очікує спонсора",
          other_avatar: other?.avatar_url || null,
          other_flag: other?.country === "Україна" ? "🇺🇦" : "🏳️",
          last_message: lastMsg?.text || null,
          last_message_at: lastMsg?.created_at || null,
          unread_count: unread,
        };
      })
    );

    // тільки ті, де є хтось з іншого боку (щоб чат мав сенс)
    const valid = previews.filter((p) => p.other_id);
    setChats(valid);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return { chats, loading, refetch: fetchChats };
};
