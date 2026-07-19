import { useCallback, useEffect, useState } from "react";
import { ShoppingBag, Star, Heart, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PullToRefresh } from "@/components/PullToRefresh";
import { tap } from "@/lib/native";
import { useProducts, Product } from "@/hooks/useProducts";

const cats = ["Всі", "Їжа", "Одяг", "Ліки", "Освіта", "Побут", "Зв'язок"];

const flagFor = (country?: string | null) => (country === "Україна" ? "🇺🇦" : "🏳️");

const Shop = () => {
  const navigate = useNavigate();
  const { listProducts } = useProducts();
  const [active, setActive] = useState("Всі");
  const [liked, setLiked] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listProducts("Всі");
    setProducts(data);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = active === "Всі" ? products : products.filter((p) => p.category === active);

  const refetch = useCallback(async () => {
    void tap("light");
    await load();
  }, [load]);

  const toggleLike = (id: string) => {
    void tap("light");
    setLiked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  };

  return (
    <div className="pb-8">
      <h1 className="sr-only">Гуманітарний магазин</h1>
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-3">
        <h2 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in mb-3">
          Гуманітарний магазин
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {cats.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                void tap("light");
                setActive(cat);
              }}
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
        {loading ? (
          <div className="px-4 mt-8 text-center text-sm text-muted-foreground">Завантаження…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 mt-16 flex flex-col items-center text-center">
            <ShoppingBag
              className="w-12 h-12 text-muted-foreground/30 mb-3"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground mb-1">Поки що немає товарів</p>
            <p className="text-xs text-muted-foreground/70">Станьте першим — додайте товар</p>
          </div>
        ) : (
          /* DESIGN.md §Anti-patterns: break symmetric 2-col — first product spans full width as hero */
          <div className="px-4 grid grid-cols-2 gap-3 mt-3">
            {filtered.map((p, idx) => {
              const isHero = idx === 0;
              return (
                <article
                  key={p.id}
                  onClick={() => {
                    void tap("light");
                    navigate(`/app/shop/${p.id}`);
                  }}
                  className={`relative bg-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:z-10 ${
                    isHero ? "col-span-2" : ""
                  }`}
                >
                  <div
                    className={`${isHero ? "h-48" : "h-28"} bg-secondary/60 flex items-center justify-center relative overflow-hidden`}
                  >
                    {p.images[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag
                        className={`${isHero ? "w-14 h-14" : "w-10 h-10"} text-muted-foreground/30`}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(p.id);
                      }}
                      aria-label={liked.includes(p.id) ? "Прибрати з обраних" : "В обрані"}
                      className="absolute top-2 right-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/80 rounded-full backdrop-blur-sm"
                    >
                      <Heart
                        className={`w-4 h-4 ${liked.includes(p.id) ? "fill-accent text-accent" : "text-muted-foreground"}`}
                        strokeWidth={1.75}
                      />
                    </button>
                    <span className="absolute top-2 left-2 text-xs bg-white/80 px-1.5 py-0.5 rounded text-foreground backdrop-blur-sm">
                      {flagFor(p.seller_country)}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">{p.category || "Товар"}</p>
                    <p
                      className={`font-semibold text-foreground leading-tight mb-2 line-clamp-2 ${isHero ? "text-base" : "text-sm"}`}
                    >
                      {p.title}
                    </p>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-3 h-3 fill-warning text-warning" strokeWidth={1.75} />
                      <span className="text-xs text-muted-foreground">
                        {(p.seller_rating ?? 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">€{(p.price_cents / 100).toFixed(0)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void tap("medium");
                          navigate(`/app/shop/${p.id}`);
                        }}
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
        )}
      </PullToRefresh>

      <button
        onClick={() => {
          void tap("medium");
          navigate("/app/shop/new");
        }}
        aria-label="Додати товар"
        className="fixed bottom-24 right-4 z-20 flex items-center gap-2 bg-accent text-white pl-4 pr-5 py-3 rounded-2xl shadow-lg font-medium text-sm transition-transform duration-150 hover:-translate-y-px"
      >
        <Plus className="w-4 h-4" strokeWidth={2} /> Додати товар
      </button>
    </div>
  );
};
export default Shop;
