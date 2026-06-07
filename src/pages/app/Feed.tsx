import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Bell, RefreshCw,
  Utensils, Pill, Shirt, Home as HomeIcon, Banknote, Package, Wrench, HandHeart,
  type LucideIcon,
} from "lucide-react";
import { useDeals } from "@/hooks/useDeals";

// DESIGN.md §Banned: no inline emoji as UI icon. Map categories → Lucide.
const categoryIcon = (cat: string): LucideIcon => {
  const map: Record<string, LucideIcon> = {
    Їжа: Utensils,
    Ліки: Pill,
    Одяг: Shirt,
    Житло: HomeIcon,
    Гроші: Banknote,
    Товари: Package,
    Завдання: Wrench,
  };
  return map[cat] ?? HandHeart;
};

const categories = ["Всі", "Гроші", "Товари", "Завдання", "Ліки", "Житло", "Їжа"];
const flags = ["🇺🇦", "🏳️"];

const MOCK_DEALS: any[] = [
  {
    id: "m1",
    creator_id: "u1",
    title: "Допомога з відновленням житла",
    description: "Мама двох дітей. Будинок зруйновано обстрілом. Потрібна допомога для відновлення житла.",
    category: "Житло",
    amount: 3200,
    raised: 2080,
    currency: "EUR",
    status: "active",
    urgent: true,
    creator_name: "Оксана К.",
    creator_flag: "🇺🇦",
    creator_city: "Харків",
    creator_rating: 4.8,
    creator_deals: 12,
  },
  {
    id: "m2",
    creator_id: "u2",
    title: "Ліки для онкохворої дитини",
    description: "Дочці 7 років, потрібен курс лікування. Страховка не покриває весь курс.",
    category: "Ліки",
    amount: 1800,
    raised: 1240,
    currency: "EUR",
    status: "active",
    urgent: true,
    creator_name: "Ахмад Р.",
    creator_flag: "🏳️",
    creator_city: "Берлін",
    creator_rating: 4.5,
    creator_deals: 7,
  },
  {
    id: "m3",
    creator_id: "u3",
    title: "Продуктовий кошик на місяць",
    description: "Сім'я з 4 дітей, чоловік на фронті. Потрібна допомога з продуктами.",
    category: "Їжа",
    amount: 400,
    raised: 280,
    currency: "EUR",
    status: "active",
    urgent: false,
    creator_name: "Марія Л.",
    creator_flag: "🇺🇦",
    creator_city: "Київ",
    creator_rating: 4.9,
    creator_deals: 23,
  },
  {
    id: "m4",
    creator_id: "u4",
    title: "Оренда квартири для біженців",
    description: "Сім'я з Маріуполя шукає тимчасове житло у Варшаві.",
    category: "Житло",
    amount: 800,
    raised: 350,
    currency: "EUR",
    status: "active",
    urgent: false,
    creator_name: "Надія С.",
    creator_flag: "🇺🇦",
    creator_city: "Варшава",
    creator_rating: 4.7,
    creator_deals: 5,
  },
];

const categoryEmoji = (cat: string) => {
  const map: Record<string, string> = {
    Їжа: "🍞",
    Ліки: "💊",
    Одяг: "👕",
    Житло: "🏠",
    Гроші: "💶",
    Товари: "📦",
    Завдання: "🛠️",
  };
  return map[cat] || "🤝";
};

const Feed = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("Всі");
  const [activeFlag, setActiveFlag] = useState<string | null>(null);
  const { deals: realDeals, loading, refetch } = useDeals({ status: "active" });

  // Real deals only — mock fallback was surfacing fake Харків/Берлін
  // names to live users when the DB happened to be empty.
  const source = realDeals;

  // Фільтрація клієнтом (щоб працювало і для mock, і для реальних)
  const displayDeals = useMemo(() => {
    return source.filter((d: any) => {
      if (activeCategory !== "Всі") {
        const catMap: Record<string, string[]> = {
          Гроші: ["Гроші"],
          Товари: ["Товари", "Одяг", "Їжа"],
          Завдання: ["Завдання"],
          Ліки: ["Ліки"],
          Житло: ["Житло"],
          Їжа: ["Їжа"],
        };
        const allowed = catMap[activeCategory] || [activeCategory];
        if (!allowed.includes(d.category)) return false;
      }
      if (activeFlag && d.creator_flag !== activeFlag) return false;
      return true;
    });
  }, [source, activeCategory, activeFlag]);

  const filteredCount = displayDeals.length;
  const sourceCount = source.length;

  return (
    <div className="pb-4">
      <h1 className="sr-only">Стрічка запитів про допомогу</h1>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="font-serif text-xl text-foreground">Стрічка</h2>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Оновити"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/app/search")}
            className="p-2 text-muted-foreground"
            aria-label="Пошук"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/app/notifications")}
            className="p-2 text-muted-foreground relative"
            aria-label="Сповіщення"
          >
            <Bell className="w-5 h-5" />
            <div className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
          </button>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 mb-2 scrollbar-hide">
          <button
            onClick={() => setActiveFlag(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              !activeFlag ? "bg-accent text-white" : "bg-secondary text-foreground"
            }`}
          >
            Всі
          </button>
          {flags.map(f => (
            <button
              key={f}
              onClick={() => setActiveFlag(activeFlag === f ? null : f)}
              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xl transition-all ${
                activeFlag === f ? "ring-2 ring-accent scale-110" : "bg-secondary"
              }`}
              aria-label={`Фільтр ${f}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {(activeCategory !== "Всі" || activeFlag) && (
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-muted-foreground">
              Показано {filteredCount} з {sourceCount}
            </span>
            <button
              onClick={() => {
                setActiveCategory("Всі");
                setActiveFlag(null);
              }}
              className="text-accent font-medium"
            >
              Скинути фільтри
            </button>
          </div>
        )}
      </div>

      {loading && (
        // DESIGN.md §Loading: skeleton, no spinner for >500ms ops.
        <div className="px-4 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border overflow-hidden">
              <div className="h-36 bg-secondary animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3 rounded bg-muted animate-pulse w-2/3" />
                <div className="h-3 rounded bg-muted animate-pulse w-1/2" />
                <div className="h-3 rounded bg-muted animate-pulse w-3/4 mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && displayDeals.length === 0 && (
        <div className="text-center py-16 px-6">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            {/* SVG empty-state icon per DESIGN.md §States */}
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.5" y2="16.5" />
            </svg>
          </div>
          <p className="font-semibold text-foreground mb-2">Нічого не знайдено</p>
          <p className="text-sm text-muted-foreground mb-4">
            За обраними фільтрами немає активних запитів.
          </p>
          <button
            onClick={() => {
              setActiveCategory("Всі");
              setActiveFlag(null);
            }}
            className="text-sm text-accent font-semibold"
          >
            Скинути фільтри
          </button>
        </div>
      )}

      <div className="px-4 space-y-4">
        {displayDeals.map((deal: any, idx: number) => {
          const pct = deal.amount > 0 ? Math.round((deal.raised / deal.amount) * 100) : 0;
          const initials = (deal.creator_name || "?")
            .split(" ")
            .map((s: string) => s[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          // DESIGN.md §Anti-patterns: break uniform-list rhythm — hero every 3rd.
          const isHero = idx % 3 === 0;
          const Icon = categoryIcon(deal.category);
          return (
            <div
              key={deal.id}
              onClick={() => navigate(`/app/deal/${deal.id}`)}
              className="relative bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] active:scale-[0.99] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:z-10"
            >
              <div className={`${isHero ? "h-48" : "h-28"} bg-primary/5 flex items-center justify-center relative`}>
                <Icon className={`${isHero ? "w-16 h-16" : "w-10 h-10"} text-muted-foreground/30`} strokeWidth={1.75} aria-hidden="true" />
                <div className="absolute top-3 left-3 flex gap-2">
                  {deal.creator_verified && (
                    <span className="bg-success/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ✓ Верифіковано
                    </span>
                  )}
                  {deal.urgent && (
                    <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      🔴 Терміново
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {deal.creator_name || "Користувач"} {deal.creator_flag || "🏳️"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {deal.creator_city || ""} · ⭐ {(deal.creator_rating || 0).toFixed(1)} ·{" "}
                      {deal.creator_deals || 0} угод
                    </p>
                  </div>
                  <span className="ml-auto text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                    {deal.category}
                  </span>
                </div>
                <p className="font-semibold text-sm text-foreground mb-1">{deal.title}</p>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{deal.description}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold text-foreground">
                    €{(deal.raised || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    з €{(deal.amount || 0).toLocaleString()} · {pct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
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
