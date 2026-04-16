import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Users, Eye, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const MOCK_STREAMS = [
  { id:"1", title:"Збір на ремонт будинку — розповідаємо ситуацію", host_name:"Оксана К.", host_flag:"🇺🇦", viewer_count:234, status:"live", goal_amount:3200, raised:2080 },
  { id:"2", title:"Humanitarian aid distribution in Kharkiv", host_name:"Relief UA", host_flag:"🇺🇦", viewer_count:87, status:"live", goal_amount:5000, raised:4120 },
  { id:"3", title:"Як отримати допомогу через BridoConnect", host_name:"BridoConnect", host_flag:"🇩🇪", viewer_count:1240, status:"ended", goal_amount:null, raised:null },
];

const LiveStreams = () => {
  const navigate = useNavigate();
  const [streams, setStreams] = useState<any[]>(MOCK_STREAMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("streams").select("*, profiles!host_id(name, avatar_url)")
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setStreams(data.map((s: any) => ({...s, host_name: s.profiles?.name || "Невідомо", host_flag:"🏳️"})));
        }
        setLoading(false);
      });
  }, []);

  const live = streams.filter(s => s.status === "live");

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-foreground">Прямі ефіри</h2>
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-white gap-1" onClick={() => navigate("/app/live/start")}>
            <Plus className="w-4 h-4" /> Запустити
          </Button>
        </div>
        {live.length > 0 && (
          <div className="flex items-center gap-2 bg-accent/10 rounded-xl px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs text-accent font-medium">{live.length} прямих ефірів зараз</span>
            <Users className="w-3 h-3 text-accent ml-auto" />
            <span className="text-xs text-accent">{live.reduce((a,s) => a + (s.viewer_count||0), 0)} глядачів</span>
          </div>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="px-4 space-y-4">
          {streams.map(s => {
            const pct = s.goal_amount && s.raised ? Math.round(s.raised/s.goal_amount*100) : null;
            return (
              <div key={s.id} className="rounded-xl border border-border overflow-hidden cursor-pointer"
                onClick={() => navigate(`/app/live/${s.id}`)}>
                <div className="h-36 bg-primary/5 flex items-center justify-center relative">
                  <Radio className="w-12 h-12 text-primary/20" />
                  <button className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
                      <Play className="w-6 h-6 text-accent fill-accent ml-1" />
                    </div>
                  </button>
                  <div className="absolute top-2 left-2">
                    {s.status === "live" ? (
                      <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE
                      </span>
                    ) : <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">Запис</span>}
                  </div>
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                    <Eye className="w-3 h-3" />{s.viewer_count || 0}
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-foreground mb-1 line-clamp-2">{s.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">{s.host_name} {s.host_flag}</p>
                  {pct !== null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Зібрано</span>
                        <span className="font-semibold text-foreground">€{s.raised} з €{s.goal_amount}</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full">
                        <div className="h-full bg-accent rounded-full" style={{width:`${Math.min(pct,100)}%`}}/>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default LiveStreams;
