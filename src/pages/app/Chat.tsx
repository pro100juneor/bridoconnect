import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Send, Paperclip, MoreVertical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { tap } from "@/lib/native";

const Chat = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { id } = useParams();
  const { user } = useAuth();
  const { messages, sendMessage, loading } = useMessages(id || "");
  const [input, setInput] = useState("");
  const [partnerName, setPartnerName] = useState("Чат");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!id) return;
    supabase.from("deals").select("title, creator_id, sponsor_id, profiles!creator_id(name)")
      .eq("id", id).single()
      .then(({ data }) => {
        if (data) setPartnerName((data.profiles as any)?.name || "Партнер");
      });
  }, [id]);

  const send = async () => {
    if (!input.trim() || !user || !id) return;
    void tap("light");
    const text = input.trim();
    setInput("");
    await sendMessage(text, user.id);
  };

  const initials = partnerName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const msgEnter = reduced
    ? { initial: false }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { type: "spring" as const, stiffness: 400, damping: 30 },
      };

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky header with backdrop-blur per DESIGN.md §Mobile checklist */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/85 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{partnerName}</p>
          <p className="text-xs text-success">онлайн</p>
        </div>
        <button
          onClick={() => { void tap("light"); navigate(`/app/deal/${id}`); }}
          className="text-xs bg-accent text-white px-3 py-1.5 rounded-2xl font-medium min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
        >
          Угода
        </button>
        <button
          aria-label="Меню"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <MoreVertical className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-secondary/20">
        {loading && (
          // DESIGN.md §Loading — 3 skeleton bubbles, alternating sides.
          <div className="space-y-3">
            <div className="flex justify-start">
              <div className="w-40 h-12 rounded-2xl bg-background animate-pulse" />
            </div>
            <div className="flex justify-end">
              <div className="w-32 h-12 rounded-2xl bg-primary/20 animate-pulse" />
            </div>
            <div className="flex justify-start">
              <div className="w-48 h-12 rounded-2xl bg-background animate-pulse" />
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <motion.div
                key={msg.id}
                {...msgEnter}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? "bg-primary text-white rounded-tr-sm"
                    : "bg-background text-foreground rounded-tl-sm shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)]"
                }`}>
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("uk", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            {/* Speech-bubble SVG, DESIGN.md §States */}
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed text-center">
              Почніть розмову — напишіть перше<br />повідомлення.
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-background/85 backdrop-blur-md">
        <button
          aria-label="Прикріпити файл"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground"
        >
          <Paperclip className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Повідомлення…"
          className="flex-1 bg-secondary rounded-xl px-4 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          aria-label="Надіслати"
          className="min-h-[44px] min-w-[44px] bg-accent rounded-2xl flex items-center justify-center disabled:opacity-50 transition-transform duration-150 hover:-translate-y-px"
        >
          <Send className="w-5 h-5 text-white" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
};
export default Chat;
