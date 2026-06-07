import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChats } from "@/hooks/useChats";

const formatTime = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("uk", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Вчора";
  return d.toLocaleDateString("uk", { day: "numeric", month: "short" });
};

const MOCK_FALLBACK = [
  { deal_id: "m1", deal_title: "Демо", deal_status: "active", other_id: "u1", other_name: "Оксана К.", other_avatar: null, other_flag: "🇺🇦", last_message: "Дякую за підтримку!", last_message_at: new Date(Date.now() - 3600000).toISOString(), unread_count: 0 },
  { deal_id: "m2", deal_title: "Демо", deal_status: "active", other_id: "u2", other_name: "Ахмад Р.", other_avatar: null, other_flag: "🏳️", last_message: "Коли буде переказ?", last_message_at: new Date(Date.now() - 7200000).toISOString(), unread_count: 0 },
];

const ChatList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chats, loading } = useChats();
  const [query, setQuery] = useState("");

  // Real chats only — mock fallback was showing fake conversations
  // (Anna/Маркус/Софія…) to authed users with 0 real chats.
  const display = chats;

  const filtered = display.filter(c =>
    c.other_name.toLowerCase().includes(query.toLowerCase()) ||
    (c.last_message || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-serif text-xl text-foreground mb-3">Повідомлення</h2>
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Пошук чатів..."
            className="bg-transparent text-sm flex-1 outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm px-4">
              {query
                ? "Нічого не знайдено"
                : "Повідомлень ще немає. Знайдіть людину і напишіть їй."}
            </div>
          )}
          {filtered.map(chat => {
            const initials = chat.other_name
              .split(" ")
              .map(n => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <button
                key={chat.deal_id}
                onClick={() => navigate(`/app/chat/${chat.deal_id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="relative">
                  {chat.other_avatar ? (
                    <img src={chat.other_avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {initials}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 text-base">{chat.other_flag}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {chat.other_name}
                    </span>
                    {chat.last_message_at && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatTime(chat.last_message_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {chat.last_message || `Деал: ${chat.deal_title}`}
                  </p>
                </div>
                {chat.unread_count > 0 && (
                  <span className="w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold">
                    {chat.unread_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatList;
