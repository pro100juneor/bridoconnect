import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Send, Users, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { tap, notify } from "@/lib/native";

const INIT_MSGS = [
  { id: 1, user: "Марія Л.", text: "Тримайтесь!", isDonation: false },
  { id: 2, user: "Anonymous", text: "Надіслала €20 на підтримку", isDonation: true },
  { id: 3, user: "Юрій Т.", text: "Слава Україні!", isDonation: false },
  { id: 4, user: "BridoConnect", text: "Ахмад надіслав €50", isDonation: true },
];

const StreamViewer = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  void useAuth(); // mount auth context for downstream actions
  const [liked, setLiked] = useState(false);
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState(INIT_MSGS);
  const [stream, setStream] = useState<any>(null);
  const [viewerCount, setViewerCount] = useState(234);

  useEffect(() => {
    if (!id) return;
    supabase.from("streams").select("*, profiles!host_id(name, country)")
      .eq("id", id).single()
      .then(({ data }) => { if (data) setStream(data); });

    const channel = supabase
      .channel(`stream_${id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "streams",
        filter: `id=eq.${id}`
      }, (payload) => {
        if (payload.new.viewer_count) setViewerCount(payload.new.viewer_count);
        if (payload.new.raised && stream) setStream((s: any) => ({ ...s, raised: payload.new.raised }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, stream]);

  const sendMsg = () => {
    if (!msg.trim()) return;
    void tap("light");
    setMessages(prev => [...prev, {
      id: Date.now(), user: "Ви", text: msg.trim(), isDonation: false
    }]);
    setMsg("");
  };

  const donate = (amt: string) => {
    void tap("medium");
    void notify("success");
    setMessages(prev => [...prev, {
      id: Date.now(), user: "Ви", text: `Надіслали ${amt}`, isDonation: true,
    }]);
  };

  const hostName = stream?.profiles?.name || "Оксана К.";
  const hostFlag = stream?.profiles?.country === "Україна" ? "🇺🇦" : "🏳️";
  const title = stream?.title || "Збір на ремонт будинку";
  const goal = stream?.goal_amount || 3200;
  const raised = stream?.raised || 2080;
  const pct = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 65;

  return (
    <div className="flex flex-col h-screen bg-black">
      <div className="relative bg-black" style={{ height: "55vh" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Radio className="w-20 h-20 text-white/10" strokeWidth={1.75} />
        </div>

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-10">
          <button
            onClick={() => navigate(-1)}
            aria-label="Назад"
            className="min-h-[44px] min-w-[44px] bg-black/40 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" strokeWidth={1.75} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-red-500 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold">LIVE</span>
            </div>
            <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full">
              <Users className="w-3 h-3 text-white" strokeWidth={1.75} />
              <span className="text-white text-xs">{viewerCount}</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <div className="relative bg-black/70 rounded-2xl p-3 mb-2 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
            <p className="text-white font-semibold text-sm">{hostName} {hostFlag}</p>
            <p className="text-white/60 text-xs">{title}</p>
            {goal > 0 && (
              <>
                <div className="mt-2 w-full h-1.5 bg-white/20 rounded-full">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-white/60">Зібрано</span>
                  <span className="text-white font-semibold">€{raised.toLocaleString()} / €{goal.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {["€5", "€10", "€20", "€50"].map(amt => (
              <button
                key={amt}
                onClick={() => donate(amt)}
                className="flex-1 min-h-[44px] py-2 bg-accent rounded-2xl text-white text-xs font-bold transition-all duration-150 hover:-translate-y-px active:scale-95"
              >
                {amt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-background flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground">Чат</span>
          <motion.button
            onClick={() => { void tap("light"); setLiked(l => !l); }}
            whileTap={{ scale: 0.85 }}
            aria-label={liked ? "Прибрати лайк" : "Лайк"}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <motion.span layoutId="stream-like" className="inline-flex">
              <Heart className={`w-5 h-5 ${liked ? "fill-accent text-accent" : "text-muted-foreground"}`} strokeWidth={1.75} />
            </motion.span>
          </motion.button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {messages.map(m => (
            <div key={m.id} className={`text-xs ${m.isDonation ? "text-accent font-semibold" : ""}`}>
              <span className="font-medium text-foreground">{m.user}: </span>
              <span className="text-muted-foreground">{m.text}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-border bg-background/85 backdrop-blur-md">
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMsg()}
            placeholder="Написати в чаті…"
            className="flex-1 bg-secondary rounded-2xl px-3 py-2 text-xs outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30"
          />
          <button
            onClick={sendMsg}
            disabled={!msg.trim()}
            aria-label="Надіслати"
            className="min-h-[44px] min-w-[44px] bg-accent rounded-2xl flex items-center justify-center disabled:opacity-50 transition-transform duration-150 hover:-translate-y-px"
          >
            <Send className="w-4 h-4 text-white" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
};
export default StreamViewer;
