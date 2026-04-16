import { useNavigate } from "react-router-dom";
import { Radio, Users, Eye, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const featured = [
  { id:"1", title:"Збір на ремонт будинку — Харків", host:"Оксана К. 🇺🇦", viewers:234, live:true },
  { id:"2", title:"Humanitarian aid distribution live", host:"Relief UA 🇺🇦", viewers:87, live:true },
  { id:"3", title:"BridoConnect: як отримати допомогу", host:"BridoConnect 🇩🇪", viewers:1240, live:false },
];

const LivePage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-16 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <Radio className="w-8 h-8 text-accent" />
          <h1 className="font-serif text-3xl text-foreground">Прямі ефіри</h1>
        </div>
        <p className="text-muted-foreground mb-8">Дивись, як люди отримують допомогу в режимі реального часу.</p>
        <div className="space-y-4 mb-8">
          {featured.map(s => (
            <div key={s.id} className="rounded-xl border border-border overflow-hidden">
              <div className="h-32 bg-primary/5 flex items-center justify-center relative">
                <Radio className="w-10 h-10 text-primary/20" />
                <div className="absolute top-2 left-2">
                  {s.live ? (
                    <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                    </span>
                  ) : <span className="bg-black/50 text-white text-[10px] px-2 py-0.5 rounded">Запис</span>}
                </div>
                <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                  <Eye className="w-3 h-3" />{s.viewers}
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.host}</p>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white" onClick={() => navigate("/register")}>
          Зареєструватись щоб дивитись все
        </Button>
      </div>
    </div>
  );
};
export default LivePage;
