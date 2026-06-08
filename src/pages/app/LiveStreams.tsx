import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Users, Eye, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PullToRefresh } from "@/components/PullToRefresh";
import { tap } from "@/lib/native";

const LiveStreams = () => {
  const navigate = useNavigate();
  void useAuth(); // keep auth side-effects mounted; user gated upstream
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("streams")
      .select("*, profiles!host_id(name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(20);
    setStreams(
      (data ?? []).map((s: any) => ({ ...s, host_name: s.profiles?.name || "Невідомо", host_flag: "🏳️" })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const live = streams.filter((s) => s.status === "live");

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">Прямі ефіри</h2>
          <Button
            size="sm"
            className="bg-accent hover:bg-accent/90 text-white gap-1 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
            onClick={() => { void tap("light"); navigate("/app/live/start"); }}
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} /> Запустити
          </Button>
        </div>
        {live.length > 0 && (
          <div className="flex items-center gap-2 bg-accent/10 rounded-2xl px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs text-accent font-medium">{live.length} прямих ефірів зараз</span>
            <Users className="w-3 h-3 text-accent ml-auto" strokeWidth={1.75} />
            <span className="text-xs text-accent">{live.reduce((a, s) => a + (s.viewer_count || 0), 0)} глядачів</span>
          </div>
        )}
      </div>

      {loading ? (
        // DESIGN.md §Loading: skeleton, alternating sizes for asymmetric rhythm
        <div className="px-4 mt-4 space-y-4">
          <div className="h-52 rounded-2xl bg-secondary animate-pulse" />
          <div className="h-36 rounded-2xl bg-secondary animate-pulse" />
          <div className="h-36 rounded-2xl bg-secondary animate-pulse" />
        </div>
      ) : streams.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
            {/* video-off SVG per DESIGN.md §States */}
            <svg viewBox="0 0 48 48" className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 14h22v20H8z" />
              <path d="M30 22l10-6v16l-10-6" />
              <path d="M6 6l36 36" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Зараз немає активних ефірів.<br />Будьте першим, хто розпочне.
          </p>
          <Button
            variant="outline"
            className="transition-transform duration-150 hover:-translate-y-px"
            onClick={() => { void tap("light"); void refetch(); }}
          >
            Оновити
          </Button>
        </div>
      ) : (
        <PullToRefresh onRefresh={refetch}>
          <div className="px-4 mt-4 space-y-4">
            {streams.map((s, idx) => {
              const pct = s.goal_amount && s.raised ? Math.round((s.raised / s.goal_amount) * 100) : null;
              // First card = hero (h-52), rest standard (h-36) — breaks symmetric list.
              const isHero = idx === 0 && live.length > 0;
              return (
                <article
                  key={s.id}
                  onClick={() => { void tap("light"); navigate(`/app/live/${s.id}`); }}
                  className="relative rounded-2xl border border-border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:z-10"
                >
                  <div className={`${isHero ? "h-52" : "h-36"} bg-primary/5 flex items-center justify-center relative`}>
                    <Radio className={`${isHero ? "w-16 h-16" : "w-12 h-12"} text-primary/20`} strokeWidth={1.75} aria-hidden="true" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`${isHero ? "w-16 h-16" : "w-14 h-14"} rounded-full bg-white/90 shadow-lg flex items-center justify-center`}>
                        <Play className={`${isHero ? "w-7 h-7" : "w-6 h-6"} text-accent fill-accent ml-1`} strokeWidth={1.75} />
                      </div>
                    </div>
                    <div className="absolute top-2 left-2">
                      {s.status === "live" ? (
                        <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                        </span>
                      ) : (
                        <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">Запис</span>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                      <Eye className="w-3 h-3" strokeWidth={1.75} />{s.viewer_count || 0}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className={`font-semibold text-foreground mb-1 line-clamp-2 ${isHero ? "text-base" : "text-sm"}`}>{s.title}</p>
                    <p className="text-xs text-muted-foreground mb-2">{s.host_name} {s.host_flag}</p>
                    {pct !== null && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Зібрано</span>
                          <span className="font-semibold text-foreground">€{s.raised} з €{s.goal_amount}</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </PullToRefresh>
      )}
    </div>
  );
};
export default LiveStreams;
