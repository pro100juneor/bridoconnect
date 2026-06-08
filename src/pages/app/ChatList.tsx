import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChats } from "@/hooks/useChats";
import { tap } from "@/lib/native";

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

const ChatList = () => {
  const navigate = useNavigate();
  void useAuth();
  const { chats, loading } = useChats();
  const [query, setQuery] = useState("");

  const filtered = chats.filter((c) =>
    c.other_name.toLowerCase().includes(query.toLowerCase()) ||
    (c.last_message || "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-3">
        <h1 className="font-serif text-4xl tracking-tight text-foreground mb-3 animate-fade-in">Повідомлення</h1>
        <div className="flex items-center gap-2 bg-secondary rounded-2xl px-3 py-2 min-h-[44px]">
          <Search className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук чатів…"
            className="bg-transparent text-sm flex-1 outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {loading ? (
        // DESIGN.md §Loading — 5 skeleton rows
        <div className="px-4 mt-3 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 px-6 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
            <svg viewBox="0 0 48 48" className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M42 23.5c0 9-7.5 16.5-17 16.5-2.4 0-4.6-.5-6.6-1.4L8 41l2.4-9.5C9.5 29.5 9 27 9 24.5 9 15.5 16.5 8 26 8s16 7.5 16 15.5z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {query
              ? "Нічого не знайдено"
              : "Повідомлень ще немає.\nЗнайдіть людину і напишіть їй."}
          </p>
        </div>
      ) : (
        <div className="px-4 mt-3 space-y-2">
          {filtered.map((chat) => {
            const initials = chat.other_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <button
                key={chat.deal_id}
                onClick={() => { void tap("light"); navigate(`/app/chat/${chat.deal_id}`); }}
                className="w-full relative flex items-center gap-3 px-3 py-3 rounded-2xl min-h-[44px] hover:bg-secondary/50 hover:-translate-y-px transition-all duration-150 text-left overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
              >
                <div className="relative">
                  {chat.other_avatar ? (
                    <img src={chat.other_avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
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
