import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Radio, Camera, Mic, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveKit } from "@/hooks/useLiveKit";
import { Confetti } from "@/components/Confetti";
import { tap, notify } from "@/lib/native";

const StartStream = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const { getStreamToken, loading: tokenLoading } = useLiveKit();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [category, setCategory] = useState("");
  const [live, setLive] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  const categories = ["Житло", "Їжа", "Ліки", "Освіта", "Транспорт", "Інше"];

  const handleStart = async () => {
    if (!user || !title) return;
    void tap("medium");
    const room = `stream-${user.id}-${Date.now()}`;

    const { data: stream } = await supabase.from("streams").insert([{
      host_id: user.id,
      title,
      category,
      goal_amount: goal ? parseFloat(goal) : null,
      room_name: room,
      status: "live",
    }]).select().single();

    const tokenData = await getStreamToken(room, true);
    if (tokenData) {
      setRoomName(room);
      setLive(true);
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2500);
      void notify("success");
    } else {
      if (stream?.id) {
        await supabase.from("streams").update({ status: "ended" }).eq("id", stream.id);
      }
      void notify("error");
      alert("Не вдалося отримати токен ефіру. Спробуйте знову.");
    }
  };

  const handleEnd = async () => {
    void tap("medium");
    if (roomName) {
      await supabase.from("streams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("room_name", roomName);
    }
    navigate("/app/live");
  };

  if (live) {
    return (
      <main className="min-h-screen flex flex-col bg-black relative">
        <Confetti trigger={celebrate} />
        <div className="flex items-center justify-between px-4 pt-10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-bold">LIVE</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
            <Eye className="w-3 h-3 text-white" strokeWidth={1.75} />
            <span className="text-white text-xs">0 глядачів</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={reduced ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="text-center"
          >
            <Camera className="w-16 h-16 text-white/20 mx-auto mb-3" strokeWidth={1.75} />
            <p className="text-white/50 text-sm leading-relaxed">Камера підключається…</p>
            <p className="text-white/30 text-xs mt-1">{roomName}</p>
          </motion.div>
        </div>
        <div className="px-4 pb-8">
          <div className="relative bg-white/10 rounded-2xl p-4 mb-4 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
            <p className="text-white font-semibold">{title}</p>
            {goal && <p className="text-white/60 text-sm mt-1">Ціль: €{goal}</p>}
          </div>
          <Button
            className="w-full bg-red-500 hover:bg-red-600 text-white min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
            onClick={handleEnd}
          >
            Завершити ефір
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">Запустити ефір</h2>
      </div>
      <div className="relative h-48 bg-secondary mx-4 mt-4 rounded-2xl flex items-center justify-center mb-6 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
        <div className="text-center">
          <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1.75} />
          <p className="text-xs text-muted-foreground">Попередній перегляд камери</p>
        </div>
      </div>
      <div className="px-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Назва ефіру *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Наприклад: Збір на ремонт будинку"
            className="w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Категорія</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { void tap("light"); setCategory(cat); }}
                className={`min-h-[44px] px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 hover:-translate-y-px ${
                  category === cat ? "bg-accent text-white border-accent" : "border-border text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Ціль збору (€)</label>
          <input
            type="number"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="0"
            className="w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="space-y-2">
          {[{ icon: Mic, label: "Мікрофон" }, { icon: Camera, label: "Камера" }].map((d) => (
            <div key={d.label} className="flex items-center justify-between p-3 bg-secondary rounded-2xl">
              <div className="flex items-center gap-2">
                <d.icon className="w-4 h-4 text-success" strokeWidth={1.75} />
                <span className="text-sm text-foreground">{d.label}</span>
              </div>
              <span className="text-xs text-success">Підключено</span>
            </div>
          ))}
        </div>
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-white gap-2 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          disabled={!title || tokenLoading}
          onClick={handleStart}
        >
          <Radio className="w-4 h-4" strokeWidth={1.75} /> {tokenLoading ? "Підключаємось…" : "Почати ефір"}
        </Button>
      </div>
    </main>
  );
};
export default StartStream;
