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
      .select(`
        id, title, status, creator_id, sponsor_id,
        creator:profiles!creator_id(name, avatar_url, country),
        sponsor:profiles!sponsor_id(name, avatar_url, country)
      `)
      .or(`creator_id.eq.${user.id},sponsor_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (error || !deals) {
      setChats([]);
      setLoading(false);
      return;
    }

    // Для кожного деалу — останнє повідомлення
    const previews: ChatPreview[] = await Promise.all(
      deals.map(async (d: any) => {
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
          unread_count: 0, // TODO: треба поле `read_by` або окрему таблицю read_receipts
        };
      })
    );

    // тільки ті, де є хтось з іншого боку (щоб чат мав сенс)
    const valid = previews.filter(p => p.other_id);
    setChats(valid);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return { chats, loading, refetch: fetchChats };
};
