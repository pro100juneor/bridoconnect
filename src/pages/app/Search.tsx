import { useState, useEffect } from "react";
import { Search as SearchIcon, SlidersHorizontal, MapPin, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const MOCK_RESULTS = [
  { id:"u1", name:"Оксана К.", country:"Україна", city:"Харків", rating:4.8, deals_count:12, tags:["Житло","Гроші"], verified:true },
  { id:"u2", name:"Ахмад Р.", country:"Сирія", city:"Берлін", rating:4.5, deals_count:7, tags:["Їжа","Одяг"], verified:true },
  { id:"u3", name:"Марія Л.", country:"Україна", city:"Київ", rating:4.9, deals_count:23, tags:["Ліки","Діти"], verified:true },
  { id:"u4", name:"Юрій Т.", country:"Україна", city:"Одеса", rating:4.3, deals_count:5, tags:["Завдання"], verified:false },
];

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>(MOCK_RESULTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) { setResults(MOCK_RESULTS); return; }
    setLoading(true);
    supabase.from("profiles").select("*").ilike("name", `%${query}%`).limit(20)
      .then(({ data }) => {
        setResults(data && data.length > 0 ? data : MOCK_RESULTS.filter(r =>
          r.name.toLowerCase().includes(query.toLowerCase()) || r.city.toLowerCase().includes(query.toLowerCase())
        ));
        setLoading(false);
      });
  }, [query]);

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-serif text-xl text-foreground mb-3">Пошук</h2>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
            <SearchIcon className="w-4 h-4 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Ім'я, місто, потреба..."
              className="bg-transparent text-sm flex-1 outline-none text-foreground placeholder:text-muted-foreground" />
          </div>
          <button className="p-2.5 bg-secondary rounded-xl"><SlidersHorizontal className="w-5 h-5 text-muted-foreground" /></button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="px-4 space-y-3">
          {results.map(r => (
            <div key={r.id} className="p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary/50"
              onClick={() => navigate(`/app/user/${r.id}`)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                  {r.avatar_url ? <img src={r.avatar_url} className="w-full h-full object-cover" alt=""/> : r.name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{r.name} {r.country === "Україна" ? "🇺🇦" : "🏳️"}</span>
                    {r.verified && <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded">✓</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />{r.city || "—"}
                    <Star className="w-3 h-3 fill-warning text-warning" />{r.rating || "—"} · {r.deals_count || 0} угод
                  </div>
                </div>
                <button className="text-xs bg-accent text-white px-3 py-1.5 rounded-lg font-medium"
                  onClick={e => { e.stopPropagation(); navigate(`/app/chat/${r.id}`); }}>
                  Зв'язатись
                </button>
              </div>
              {r.tags && (
                <div className="flex gap-1.5">
                  {(r.tags || []).map((tag: string) => <span key={tag} className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs rounded-full">{tag}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default Search;
