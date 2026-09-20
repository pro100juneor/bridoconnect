import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Send, Paperclip, MoreVertical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/i18n/useT";
import { tap } from "@/lib/native";
import { toast } from "@/hooks/use-toast";
import { submitReport } from "@/lib/reports";

const Chat = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { id } = useParams();
  const { user } = useAuth();
  const { t, localeTag } = useT();
  const { messages, sendMessage, loading } = useMessages(id || "");
  const [input, setInput] = useState("");
  const [partnerName, setPartnerName] = useState(() => t("chat.titleFallback", "Чат"));
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleReport = async () => {
    setMenuOpen(false);
    if (!user || !partnerId || !id) return;
    void tap("light");
    const { error } = await submitReport(user.id, partnerId, `chat:deal:${id}`);
    if (error) {
      toast({ title: t("chat.reportError", "Не вдалося надіслати"), variant: "destructive" });
    } else {
      toast({
        title: t("chat.reportSent", "Скаргу надіслано"),
        description: t("chat.reportSentDesc", "Дякуємо, ми розглянемо звернення."),
      });
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Відкритий чат = прочитано: оновлюємо позначку при вході й нових повідомленнях
  useEffect(() => {
    if (!id || !user) return;
    void supabase
      .from("chat_reads")
      .upsert({ user_id: user.id, deal_id: id, last_read_at: new Date().toISOString() });
  }, [id, user, messages.length]);

  // Співрозмовник — це друга сторона угоди, а не завжди її автор.
  useEffect(() => {
    if (!id || !user) return;
    let alive = true;
    void (async () => {
      const { data: deal } = await supabase
        .from("deals")
        .select("creator_id, sponsor_id")
        .eq("id", id)
        .single();
      if (!alive || !deal) return;
      const other = deal.creator_id === user.id ? deal.sponsor_id : deal.creator_id;
      if (!other) {
        setPartnerName(t("chat.partnerFallback", "Партнер"));
        return;
      }
      setPartnerId(other);
      const { data: profile } = await supabase.from("profiles").select("name").eq("id", other).maybeSingle();
      if (alive) setPartnerName(profile?.name || t("chat.partnerFallback", "Партнер"));
    })();
    return () => {
      alive = false;
    };
  }, [id, user, t]);

  // Реальний presence через Supabase Realtime: обидві сторони трекають себе в
  // каналі угоди. «Онлайн» показуємо, лише поки партнер справді в каналі —
  // раніше тут був статичний підпис, який брехав завжди.
  useEffect(() => {
    if (!id || !user) return;
    const channel = supabase.channel(`presence:deal:${id}`, {
      config: { presence: { key: user.id } },
    });

    const syncOnline = () => {
      const state = channel.presenceState();
      setPartnerOnline(!!partnerId && Object.prototype.hasOwnProperty.call(state, partnerId));
    };

    channel
      .on("presence", { event: "sync" }, syncOnline)
      .on("presence", { event: "join" }, syncOnline)
      .on("presence", { event: "leave" }, syncOnline)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      setPartnerOnline(false);
      void supabase.removeChannel(channel);
    };
  }, [id, user, partnerId]);

  const send = async () => {
    if (!input.trim() || !user || !id) return;
    void tap("light");
    const text = input.trim();
    setInput("");
    await sendMessage(text, user.id);
  };

  const initials = partnerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
          aria-label={t("common.back", "Назад")}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{partnerName}</p>
          {/* Без presence-даних не пишемо нічого — вигадувати статус не можна. */}
          {partnerOnline && <p className="text-xs text-success">{t("chat.online", "онлайн")}</p>}
        </div>
        <button
          onClick={() => {
            void tap("light");
            navigate(`/app/deal/${id}`);
          }}
          className="text-xs bg-accent text-white px-3 py-1.5 rounded-2xl font-medium min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
        >
          {t("deal.title", "Угода")}
        </button>
        <div className="relative">
          <button
            onClick={() => {
              void tap("light");
              setMenuOpen((o) => !o);
            }}
            aria-label={t("chat.menuAria", "Меню")}
            aria-expanded={menuOpen}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <MoreVertical className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-30 w-52 bg-background rounded-xl border border-border shadow-lg overflow-hidden">
                <button
                  onClick={handleReport}
                  className="w-full text-left px-4 py-3 text-sm text-destructive hover:bg-secondary min-h-[44px]"
                >
                  {t("chat.report", "Поскаржитися на користувача")}
                </button>
              </div>
            </>
          )}
        </div>
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
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <motion.div
                key={msg.id}
                {...msgEnter}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-background text-foreground rounded-tl-sm shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)]"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString(localeTag, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
              <svg
                viewBox="0 0 24 24"
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed text-center">
              {t("chat.emptyLine1", "Почніть розмову — напишіть перше")}
              <br />
              {t("chat.emptyLine2", "повідомлення.")}
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-background/85 backdrop-blur-md">
        <button
          aria-label={t("chat.attachAria", "Прикріпити файл")}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground"
        >
          <Paperclip className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={t("chat.inputPlaceholder", "Повідомлення…")}
          className="flex-1 bg-secondary rounded-xl px-4 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          aria-label={t("chat.sendAria", "Надіслати")}
          className="min-h-[44px] min-w-[44px] bg-accent rounded-2xl flex items-center justify-center disabled:opacity-50 transition-transform duration-150 hover:-translate-y-px"
        >
          <Send className="w-5 h-5 text-white" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
};
export default Chat;
