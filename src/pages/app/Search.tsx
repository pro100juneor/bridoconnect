import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, SlidersHorizontal, MapPin, Star, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { tap } from "@/lib/native";

const Search = () => {
  const navigate = useNavigate();
  void useAuth(); // mount auth ctx

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); setLoading(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      supabase.from("profiles")
        .select("id, name, city, country, rating, deals_count, verified, avatar_url")
        .ilike("name", `%${query}%`).limit(20)
        .then(({ data }) => {
          // Real results only — mock fallback was surfacing fake names to live users.
          setResults(data ?? []);
          setLoading(false);
        });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-3">
        <h1 className="font-serif text-4xl tracking-tight text-foreground mb-3 animate-fade-in">Пошук</h1>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-secondary rounded-2xl px-3 py-2 min-h-[44px]">
            <SearchIcon className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ім'я, місто, потреба…"
              className="bg-transparent text-sm flex-1 outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button
            className="min-h-[44px] min-w-[44px] bg-secondary rounded-2xl flex items-center justify-center transition-transform duration-150 hover:-translate-y-px"
            aria-label="Фільтри"
            onClick={() => { void tap("light"); }}
          >
            <SlidersHorizontal className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {loading ? (
        // DESIGN.md §Loading: skeleton rows
        <div className="px-4 mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="px-6 py-12 text-center flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
            <svg viewBox="0 0 48 48" className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="22" cy="22" r="14" />
              <line x1="40" y1="40" x2="32" y2="32" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {query.length < 2 ? "Введіть ім'я або місто" : "Нічого не знайдено"}
          </p>
        </div>
      ) : (
        <div className="px-4 mt-3 space-y-3">
          {results.map((r) => (
            <article
              key={r.id}
              className="relative p-4 rounded-2xl border border-border cursor-pointer hover:bg-secondary/50 hover:-translate-y-px transition-all duration-150 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
              onClick={() => { void tap("light"); navigate(`/app/user/${r.id}`); }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary overflow-hidden">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    r.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {r.name} {r.country === "Україна" ? "🇺🇦" : "🏳️"}
                    </span>
                    {r.verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" strokeWidth={1.75} aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" strokeWidth={1.75} />
                    {r.city || "—"}
                    <Star className="w-3 h-3 fill-warning text-warning" strokeWidth={1.75} />
                    {r.rating || "—"} · {r.deals_count || 0} угод
                  </div>
                </div>
                <button
                  className="text-xs bg-accent text-white px-3 py-1.5 rounded-2xl font-medium min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
                  onClick={(e) => { e.stopPropagation(); void tap("medium"); navigate(`/app/chat/${r.id}`); }}
                >
                  Зв'язатись
                </button>
              </div>
              {r.tags && (
                <div className="flex gap-1.5">
                  {(r.tags || []).map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
export default Search;
