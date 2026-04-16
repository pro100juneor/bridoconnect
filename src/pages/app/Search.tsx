import { useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, MapPin, Star } from "lucide-react";

const results = [
  { id: "1", name: "Оксана К.", flag: "🇺🇦", city: "Харків", rating: 4.8, deals: 12, tags: ["Житло", "Гроші"], verified: true },
  { id: "2", name: "Ахмад Р.", flag: "🏳️", city: "Берлін", rating: 4.5, deals: 7, tags: ["Їжа", "Одяг"], verified: true },
  { id: "3", name: "Марія Л.", flag: "🇺🇦", city: "Київ", rating: 4.9, deals: 23, tags: ["Ліки", "Діти"], verified: true },
  { id: "4", name: "Юрій Т.", flag: "🇺🇦", city: "Одеса", rating: 4.3, deals: 5, tags: ["Завдання"], verified: false },
  { id: "5", name: "Fatima H.", flag: "🏳️", city: "Відень", rating: 4.7, deals: 9, tags: ["Гроші", "Одяг"], verified: true },
];

const Search = () => {
  const [query, setQuery] = useState("");
  const filtered = results.filter(r => r.name.toLowerCase().includes(query.toLowerCase()) || r.city.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-serif text-xl text-foreground mb-3">Пошук</h2>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
            <SearchIcon className="w-4 h-4 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Ім'я, місто, потреба..." className="bg-transparent text-sm flex-1 outline-none text-foreground placeholder:text-muted-foreground" />
          </div>
          <button className="p-2.5 bg-secondary rounded-xl"><SlidersHorizontal className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {["Всі", "🇺🇦 Україна", "🏳️ Інші", "Верифіковані", "Онлайн"].map(tag => (
            <button key={tag} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-foreground border border-border">
              {tag}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 space-y-3">
        {filtered.map(r => (
          <div key={r.id} className="p-4 rounded-xl border border-border bg-background">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {r.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{r.name} {r.flag}</span>
                  {r.verified && <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded">✓</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />{r.city}
                  <Star className="w-3 h-3 fill-warning text-warning" />{r.rating} · {r.deals} угод
                </div>
              </div>
              <button className="text-xs bg-accent text-white px-3 py-1.5 rounded-lg font-medium">Зв'язатись</button>
            </div>
            <div className="flex gap-1.5">
              {r.tags.map(tag => <span key={tag} className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs rounded-full">{tag}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Search;
