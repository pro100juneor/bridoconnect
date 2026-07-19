import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Send, Users, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStreamRoom } from "@/hooks/useStreamRoom";
import { useStripe } from "@/hooks/useStripe";
import { tap, notify } from "@/lib/native";

type StreamRow = {
  id: string;
  title: string;
  room_name: string;
  goal_amount: number | null;
  raised: number;
  status: string;
  viewer_count: number;
  profiles?: { name?: string; country?: string } | null;
};

const StreamViewer = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { createStreamDonation } = useStripe();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { connect, disconnect, sendChat, participants, messages } = useStreamRoom(videoRef);
  const [liked, setLiked] = useState(false);
  const [msg, setMsg] = useState("");
  const [stream, setStream] = useState<StreamRow | null>(null);
  const [dbViewerCount, setDbViewerCount] = useState<number | null>(null);

  // Load stream + subscribe to raised/viewer updates.
  useEffect(() => {
    if (!id) return;
    let active = true;
    supabase
      .from("streams")
      .select("*, profiles!host_id(name, country)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (active && data) setStream(data as StreamRow);
      });

    const channel = supabase
      .channel(`stream_${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "streams", filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as Partial<StreamRow>;
          if (typeof next.viewer_count === "number") setDbViewerCount(next.viewer_count);
          setStream((s) => (s ? { ...s, ...next } : s));
        }
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Join the LiveKit room as a viewer once we know the room name.
  useEffect(() => {
    if (!stream?.room_name || stream.status !== "live") return;
    void connect(stream.room_name, false);
    return () => {
      void disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream?.room_name, stream?.status]);

  const sendMsg = () => {
    if (!msg.trim()) return;
    void tap("light");
    void sendChat(user?.user_metadata?.name || "Ви", msg.trim(), false);
    setMsg("");
  };

  const donate = async (amt: number) => {
    if (!id) return;
    void tap("medium");
    try {
      await createStreamDonation({ streamId: id, amount: amt });
      // On success Stripe redirects away; nothing else to do here.
    } catch {
      void notify("error");
    }
  };

  const hostName = stream?.profiles?.name || "Ефір";
  const hostFlag = stream?.profiles?.country === "Україна" ? "🇺🇦" : "🏳️";
  const title = stream?.title || "";
  const goal = stream?.goal_amount || 0;
  const raised = stream?.raised || 0;
  const pct = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
  const viewerCount = dbViewerCount ?? Math.max(participants - 1, 0);

  return (
    <div className="flex flex-col h-screen bg-black">
      <div className="relative bg-black" style={{ height: "55vh" }}>
        <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
            <p className="text-white font-semibold text-sm">
              {hostName} {hostFlag}
            </p>
            <p className="text-white/60 text-xs">{title}</p>
            {goal > 0 && (
              <>
                <div className="mt-2 w-full h-1.5 bg-white/20 rounded-full">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-white/60">Зібрано</span>
                  <span className="text-white font-semibold">
                    €{raised.toLocaleString()} / €{goal.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {[5, 10, 20, 50].map((amt) => (
              <button
                key={amt}
                onClick={() => donate(amt)}
                className="flex-1 min-h-[44px] py-2 bg-accent rounded-2xl text-white text-xs font-bold transition-all duration-150 hover:-translate-y-px active:scale-95"
              >
                €{amt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-background flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground">Чат</span>
          <motion.button
            onClick={() => {
              void tap("light");
              setLiked((l) => !l);
            }}
            whileTap={{ scale: 0.85 }}
            aria-label={liked ? "Прибрати лайк" : "Лайк"}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <motion.span layoutId="stream-like" className="inline-flex">
              <Heart
                className={`w-5 h-5 ${liked ? "fill-accent text-accent" : "text-muted-foreground"}`}
                strokeWidth={1.75}
              />
            </motion.span>
          </motion.button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground/60">Повідомлень поки немає — будьте першим 👋</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`text-xs ${m.isDonation ? "text-accent font-semibold" : ""}`}>
              <span className="font-medium text-foreground">{m.user}: </span>
              <span className="text-muted-foreground">{m.text}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-border bg-background/85 backdrop-blur-md">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMsg()}
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
