import { useNavigate } from "react-router-dom";
import { ShoppingBag, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const products = [
  { id: "1", name: "Дитячий одяг (пакет)", price: 35, category: "Одяг", flag: "🇩🇪", rating: 4.8 },
  { id: "2", name: "Продуктовий набір", price: 45, category: "Їжа", flag: "🇵🇱", rating: 4.9 },
  { id: "3", name: "Аптечка перша допомога", price: 28, category: "Ліки", flag: "🇩🇪", rating: 4.7 },
  { id: "4", name: "Шкільний рюкзак", price: 52, category: "Освіта", flag: "🇦🇹", rating: 4.6 },
  { id: "5", name: "Ковдра та постільна білизна", price: 39, category: "Побут", flag: "🇩🇪", rating: 4.8 },
  { id: "6", name: "Телефонна картка (30 днів)", price: 15, category: "Зв'язок", flag: "🇺🇦", rating: 4.5 },
];

const ShopCatalogPage = () => {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-background">
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <ShoppingBag className="w-8 h-8 text-accent" strokeWidth={1.75} />
          <h1 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">Гуманітарний магазин</h1>
        </div>
        <p className="text-muted-foreground mb-12 leading-relaxed">
          Товари від верифікованих організацій. Безпосередня допомога без посередників.
        </p>
        {/* DESIGN.md §Anti-patterns: break symmetric 2-col — first product hero col-span-2 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {products.map((p, idx) => {
            const isHero = idx === 0;
            return (
              <article
                key={p.id}
                className={`relative rounded-2xl overflow-hidden transition-shadow duration-200 hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:z-10 bg-card ${
                  isHero ? "col-span-2" : ""
                }`}
              >
                <div className={`${isHero ? "h-40" : "h-24"} bg-secondary/60 flex items-center justify-center relative`}>
                  <ShoppingBag className={`${isHero ? "w-12 h-12" : "w-8 h-8"} text-muted-foreground/20`} strokeWidth={1.75} aria-hidden="true" />
                  <span className="absolute top-2 left-2 text-base bg-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm">{p.flag}</span>
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">{p.category}</p>
                  <p className={`font-semibold text-foreground mb-1 ${isHero ? "text-base" : "text-sm"}`}>{p.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">€{p.price}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-warning text-warning" strokeWidth={1.75} />{p.rating}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-white gap-2 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          onClick={() => navigate("/register")}
        >
          Зареєструватись для замовлення <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
        </Button>
      </section>
    </main>
  );
};
export default ShopCatalogPage;
