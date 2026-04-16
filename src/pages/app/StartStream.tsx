import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Radio, Camera, Mic, DollarSign, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveKit } from "@/hooks/useLiveKit";

const StartStream = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getStreamToken, loading: tokenLoading } = useLiveKit();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [category, setCategory] = useState("");
  const [live, setLive] = useState(false);
  const [roomName, setRoomName] = useState("");

  const categories = ["Житло","Їжа","Ліки","Освіта","Транспорт","Інше"];

  const handleStart = async () => {
    if (!user || !title) return;
    const room = `stream-${user.id}-${Date.now()}`;

    // Save stream to DB
    const { data: stream } = await supabase.from("streams").insert([{
      host_id: user.id,
      title,
      category,
      goal_amount: goal ? parseFloat(goal) : null,
      room_name: room,
      status: "live",
    }]).select().single();

    // Get LiveKit token
    const tokenData = await getStreamToken(room, true);
    if (tokenData) {
      setRoomName(room);
      setLive(true);
    }
  };

  const handleEnd = async () => {
    if (roomName) {
      await supabase.from("streams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("room_name", roomName);
    }
    navigate("/app/live");
  };

  if (live) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 pt-10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-bold">LIVE</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
            <Eye className="w-3 h-3 text-white"/><span className="text-white text-xs">0 глядачів</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Camera className="w-16 h-16 text-white/20 mx-auto mb-3"/>
            <p className="text-white/50 text-sm">Камера підключається...</p>
            <p className="text-white/30 text-xs mt-1">{roomName}</p>
          </div>
        </div>
        <div className="px-4 pb-8">
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <p className="text-white font-semibold">{title}</p>
            {goal && <p className="text-white/60 text-sm mt-1">Ціль: €{goal}</p>}
          </div>
          <Button className="w-full bg-red-500 hover:bg-red-600 text-white" onClick={handleEnd}>
            Завершити ефір
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Запустити ефір</h2>
      </div>
      <div className="h-48 bg-secondary mx-4 mt-4 rounded-2xl flex items-center justify-center mb-6">
        <div className="text-center">
          <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2"/>
          <p className="text-xs text-muted-foreground">Попередній перегляд камери</p>
        </div>
      </div>
      <div className="px-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Назва ефіру *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Наприклад: Збір на ремонт будинку"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground"/>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Категорія</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${category===cat?"bg-accent text-white border-accent":"border-border text-foreground"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Ціль збору (€)</label>
          <input type="number" value={goal} onChange={e => setGoal(e.target.value)} placeholder="0"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground"/>
        </div>
        <div className="space-y-2">
          {[{icon:Mic,label:"Мікрофон"},{icon:Camera,label:"Камера"}].map(d=>(
            <div key={d.label} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
              <div className="flex items-center gap-2"><d.icon className="w-4 h-4 text-success"/><span className="text-sm text-foreground">{d.label}</span></div>
              <span className="text-xs text-success">Підключено</span>
            </div>
          ))}
        </div>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white gap-2" disabled={!title || tokenLoading} onClick={handleStart}>
          <Radio className="w-4 h-4"/> {tokenLoading ? "Підключаємось..." : "Почати ефір"}
        </Button>
      </div>
    </div>
  );
};
export default StartStream;
