import { useNavigate } from "react-router-dom";
import { Radio, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const featured = [
  { id: "1", title: "Збір на ремонт будинку — Харків", host: "Оксана К.", flag: "🇺🇦", viewers: 234, live: true },
  { id: "2", title: "Humanitarian aid distribution live", host: "Relief UA", flag: "🇺🇦", viewers: 87, live: true },
  { id: "3", title: "BridoConnect: як отримати допомогу", host: "BridoConnect", flag: "🇩🇪", viewers: 1240, live: false },
];

const LivePage = () => {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-background">
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <Radio className="w-8 h-8 text-accent" strokeWidth={1.75} />
          <h1 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">Прямі ефіри</h1>
        </div>
        <p className="text-muted-foreground mb-12 leading-relaxed">
          Дивись, як люди отримують допомогу в режимі реального часу.
        </p>
        <div className="space-y-4 mb-8">
          {featured.map((s, idx) => {
            const isHero = idx === 0 && s.live;
            return (
              <article
                key={s.id}
                className="relative rounded-2xl border border-border overflow-hidden transition-shadow duration-200 hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:z-10"
              >
                <div className={`${isHero ? "h-48" : "h-32"} bg-primary/5 flex items-center justify-center relative`}>
                  <Radio className={`${isHero ? "w-14 h-14" : "w-10 h-10"} text-primary/20`} strokeWidth={1.75} />
                  <div className="absolute top-2 left-2">
                    {s.live ? (
                      <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                      </span>
                    ) : (
                      <span className="bg-black/50 text-white text-[10px] px-2 py-0.5 rounded">Запис</span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                    <Eye className="w-3 h-3" strokeWidth={1.75} />{s.viewers}
                  </div>
                </div>
                <div className="p-3">
                  <p className={`font-semibold text-foreground ${isHero ? "text-base" : "text-sm"}`}>{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.host} {s.flag}</p>
                </div>
              </article>
            );
          })}
        </div>
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-white min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          onClick={() => navigate("/register")}
        >
          Зареєструватись щоб дивитись все
        </Button>
      </section>
    </main>
  );
};
export default LivePage;
