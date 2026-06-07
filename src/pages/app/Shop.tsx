import { useCallback, useState } from "react";
import { ShoppingBag, Star, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PullToRefresh } from "@/components/PullToRefresh";
import { tap } from "@/lib/native";

const products = [
  { id:"1", name:"Дитячий одяг (пакет)", price:35, category:"Одяг", flag:"🇩🇪", rating:4.8, reviews:24, sold:156 },
  { id:"2", name:"Продуктовий набір на тиждень", price:45, category:"Їжа", flag:"🇵🇱", rating:4.9, reviews:87, sold:342 },
  { id:"3", name:"Аптечка перша допомога", price:28, category:"Ліки", flag:"🇩🇪", rating:4.7, reviews:31, sold:98 },
  { id:"4", name:"Шкільний рюкзак з приладдям", price:52, category:"Освіта", flag:"🇦🇹", rating:4.6, reviews:19, sold:67 },
  { id:"5", name:"Ковдра та постільна білизна", price:39, category:"Побут", flag:"🇩🇪", rating:4.8, reviews:42, sold:211 },
  { id:"6", name:"Телефонна картка (30 днів)", price:15, category:"Зв'язок", flag:"🇺🇦", rating:4.5, reviews:63, sold:445 },
];

const cats = ["Всі", "Їжа", "Одяг", "Ліки", "Освіта", "Побут", "Зв'язок"];

const Shop = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState("Всі");
  const [liked, setLiked] = useState<string[]>([]);

  const filtered = active === "Всі" ? products : products.filter((p) => p.category === active);
  // Until shop has a real Supabase source, pull-to-refresh is a no-op.
  const refetch = useCallback(async () => {
    void tap("light");
  }, []);

  const handleBuy = (p: typeof products[0]) => {
    void tap("medium");
    navigate(`/app/shop/${p.id}`);
  };

  const toggleLike = (id: string) => {
    void tap("light");
    setLiked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  };

  return (
    <div className="pb-8">
      <h1 className="sr-only">Гуманітарний магазин</h1>
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-3">
        <h2 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in mb-3">Гуманітарний магазин</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {cats.map((cat) => (
            <button
              key={cat}
              onClick={() => { void tap("light"); setActive(cat); }}
              className={`shrink-0 min-h-[44px] px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active === cat ? "bg-accent text-white" : "bg-secondary text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <PullToRefresh onRefresh={refetch}>
        {/* DESIGN.md §Anti-patterns: break symmetric 2-col — first product spans full width as hero */}
        <div className="px-4 grid grid-cols-2 gap-3 mt-3">
          {filtered.map((p, idx) => {
            const isHero = idx === 0;
            return (
              <article
                key={p.id}
                onClick={() => { void tap("light"); navigate(`/app/shop/${p.id}`); }}
                className={`relative bg-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:z-10 ${
                  isHero ? "col-span-2" : ""
                }`}
              >
                <div className={`${isHero ? "h-48" : "h-28"} bg-secondary/60 flex items-center justify-center relative`}>
                  <ShoppingBag className={`${isHero ? "w-14 h-14" : "w-10 h-10"} text-muted-foreground/30`} strokeWidth={1.75} aria-hidden="true" />
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(p.id); }}
                    aria-label={liked.includes(p.id) ? "Прибрати з обраних" : "В обрані"}
                    className="absolute top-2 right-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/80 rounded-full backdrop-blur-sm"
                  >
                    <Heart className={`w-4 h-4 ${liked.includes(p.id) ? "fill-accent text-accent" : "text-muted-foreground"}`} strokeWidth={1.75} />
                  </button>
                  <span className="absolute top-2 left-2 text-xs bg-white/80 px-1.5 py-0.5 rounded text-foreground backdrop-blur-sm">{p.flag}</span>
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">{p.category}</p>
                  <p className={`font-semibold text-foreground leading-tight mb-2 line-clamp-2 ${isHero ? "text-base" : "text-sm"}`}>{p.name}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 fill-warning text-warning" strokeWidth={1.75} />
                    <span className="text-xs text-muted-foreground">{p.rating} ({p.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">€{p.price}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleBuy(p); }}
                      className="text-xs bg-accent text-white px-3 py-1.5 rounded-2xl font-medium min-h-[44px] transition-transform duration-150 hover:-translate-y-px disabled:opacity-60"
                    >
                      Купити
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </PullToRefresh>
    </div>
  );
};
export default Shop;
