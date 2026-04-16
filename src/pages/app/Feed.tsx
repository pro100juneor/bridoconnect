import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, Search, Bell } from "lucide-react";
import { useDeals } from "@/hooks/useDeals";

const COUNTRY_FLAGS: Record<string, string> = {
  "Україна": "🇺🇦", "Сирія": "🏳️", "Палестина": "🏳️", "Афганістан": "🏳️", "Судан": "🏳️",
};

const MOCK_DEALS = [
  { id:"1", creator_id:"u1", title:"Допомога з відновленням житла", description:"Мама двох дітей. Будинок зруйновано обстрілом. Потрібна допомога для відновлення житла.", category:"Житло", amount:3200, raised:2080, currency:"EUR", status:"active", urgent:true, creator_name:"Оксана К.", creator_flag:"🇺🇦", creator_city:"Харків", creator_rating:4.8, creator_deals:12 },
  { id:"2", creator_id:"u2", title:"Ліки для онкохворої дитини", description:"Дочці 7 років, потрібен курс лікування. Страховка не покриває весь курс.", category:"Ліки", amount:1800, raised:1240, currency:"EUR", status:"active", urgent:true, creator_name:"Ахмад Р.", creator_flag:"🏳️", creator_city:"Берлін", creator_rating:4.5, creator_deals:7 },
  { id:"3", creator_id:"u3", title:"Продуктовий кошик на місяць", description:"Сім'я з 4 дітей, чоловік на фронті. Потрібна допомога з продуктами.", category:"Їжа", amount:400, raised:280, currency:"EUR", status:"active", urgent:false, creator_name:"Марія Л.", creator_flag:"🇺🇦", creator_city:"Київ", creator_rating:4.9, creator_deals:23 },
  { id:"4", creator_id:"u4", title:"Оренда квартири для біженців", description:"Сім'я з Маріуполя шукає тимчасове житло у Варшаві.", category:"Житло", amount:800, raised:350, currency:"EUR", status:"active", urgent:false, creator_name:"Надія С.", creator_flag:"🇺🇦", creator_city:"Варшава", creator_rating:4.7, creator_deals:5 },
];

const categories = ["Всі", "Гроші", "Товари", "Завдання"];
const flags = ["🇺🇦", "🏳️"];

const Feed = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("Всі");
  const [activeFlag, setActiveFlag] = useState<string | null>(null);
  const { deals: realDeals, loading } = useDeals({ status: "active" });

  const displayDeals = realDeals.length > 0 ? realDeals : MOCK_DEALS;

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="font-serif text-xl text-foreground">Стрічка</h2>
        <div className="flex gap-2">
          <button onClick={() => navigate("/app/search")} className="p-2 text-muted-foreground">
            <Search className="w-5 h-5" />
          </button>
          <button onClick={() => navigate("/app/notifications")} className="p-2 text-muted-foreground relative">
            <Bell className="w-5 h-5" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
          </button>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
          <button onClick={() => setActiveFlag(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${!activeFlag ? "bg-accent text-white" : "bg-secondary text-foreground"}`}>
            Всі
          </button>
          {flags.map(f => (
            <button key={f} onClick={() => setActiveFlag(activeFlag === f ? null : f)}
              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xl ${activeFlag === f ? "ring-2 ring-accent" : "bg-secondary"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat ? "bg-primary text-white" : "text-muted-foreground"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="px-4 space-y-4">
        {(displayDeals as any[]).map((deal: any) => {
          const pct = deal.amount > 0 ? Math.round((deal.raised / deal.amount) * 100) : 0;
          return (
            <div key={deal.id} onClick={() => navigate(`/app/deal/${deal.id}`)}
              className="rounded-2xl border border-border overflow-hidden cursor-pointer active:scale-[0.99] transition-transform">
              <div className="h-36 bg-primary/5 flex items-center justify-center relative">
                <span className="text-6xl opacity-20">
                  {deal.category === "Їжа" ? "🍞" : deal.category === "Ліки" ? "💊" : deal.category === "Одяг" ? "👕" : "🏠"}
                </span>
                <div className="absolute top-3 left-3 flex gap-2">
                  {deal.status === "active" && (
                    <span className="bg-success/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">✓ Верифіковано</span>
                  )}
                  {deal.urgent && (
                    <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">🔴 Терміново</span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {(deal.creator_name || "?").slice(0,2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {deal.creator_name || "Користувач"} {deal.creator_flag || "🏳️"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {deal.creator_city || ""} · ⭐ {deal.creator_rating || "—"} · {deal.creator_deals || 0} угод
                    </p>
                  </div>
                  <span className="ml-auto text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{deal.category}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{deal.description}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold text-foreground">€{(deal.raised || 0).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">з €{(deal.amount || 0).toLocaleString()} · {pct}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Feed;
