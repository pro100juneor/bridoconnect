import { useNavigate } from "react-router-dom";
import { Radio, Users, Eye, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const streams = [
  { id: "1", title: "Збір на ремонт будинку — розповідаємо ситуацію", host: "Оксана К.", flag: "🇺🇦", viewers: 234, live: true, goal: "€3 200", raised: "€2 080" },
  { id: "2", title: "Humanitarian aid distribution in Kharkiv", host: "Relief UA", flag: "🇺🇦", viewers: 87, live: true, goal: "€5 000", raised: "€4 120" },
  { id: "3", title: "Запис: Як отримати допомогу через BridoConnect", host: "BridoConnect", flag: "🇩🇪", viewers: 1240, live: false, goal: null, raised: null },
  { id: "4", title: "Сім'я біженців — наша історія з Маріуполя", host: "Надія С.", flag: "🇺🇦", viewers: 56, live: true, goal: "€1 800", raised: "€620" },
];

const LiveStreams = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-foreground">Прямі ефіри</h2>
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-white gap-1" onClick={() => navigate("/app/live/start")}>
            <Plus className="w-4 h-4" /> Запустити
          </Button>
        </div>
        <div className="flex items-center gap-2 bg-accent/10 rounded-xl px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-accent font-medium">{streams.filter(s => s.live).length} прямих ефірів зараз</span>
          <Users className="w-3 h-3 text-accent ml-auto" />
          <span className="text-xs text-accent">{streams.filter(s=>s.live).reduce((a,s)=>a+s.viewers,0)} глядачів</span>
        </div>
      </div>
      <div className="px-4 space-y-4">
        {streams.map(s => (
          <div key={s.id} className="rounded-xl border border-border overflow-hidden">
            <div className="h-36 bg-primary/5 flex items-center justify-center relative">
              <Radio className="w-12 h-12 text-primary/20" />
              <button className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-accent fill-accent ml-1" />
                </div>
              </button>
              <div className="absolute top-2 left-2 flex items-center gap-1">
                {s.live ? (
                  <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                  </span>
                ) : (
                  <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">Запис</span>
                )}
              </div>
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                <Eye className="w-3 h-3" /> {s.viewers}
              </div>
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm text-foreground mb-1 line-clamp-2">{s.title}</p>
              <p className="text-xs text-muted-foreground mb-2">{s.host} {s.flag}</p>
              {s.goal && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Зібрано</span>
                    <span className="font-semibold text-foreground">{s.raised} з {s.goal}</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full">
                    <div className="h-full bg-accent rounded-full" style={{width: `${Math.round(parseInt(s.raised.replace(/[^0-9]/g,""))/parseInt(s.goal.replace(/[^0-9]/g,""))*100)}%`}} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default LiveStreams;
