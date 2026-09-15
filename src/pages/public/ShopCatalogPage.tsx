import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { useProducts } from "@/hooks/useProducts";
import { useT } from "@/i18n/useT";

// Цены демо заданы в евро, поэтому показываем их через formatIn(..., DEMO_CURRENCY):
// это честная сумма в своей валюте, без конвертации по несуществующему курсу.
const DEMO_CURRENCY = "eur";

interface CatalogCard {
  id: string;
  name: string;
  nameKey?: string;
  price: number;
  currency: string;
  category: string;
  categoryKey?: string;
  flag: string;
  rating: number;
}

// Демо-витрина: показывается ТОЛЬКО пока в базе нет ни одного активного товара,
// и только с явной плашкой. Страница обещает «товари від верифікованих
// організацій» — выдавать за них выдуманные позиции нельзя.
const demoProducts: CatalogCard[] = [
  {
    id: "1",
    nameKey: "shop.demo.kidsClothes",
    name: "Дитячий одяг (пакет)",
    price: 35,
    currency: DEMO_CURRENCY,
    categoryKey: "product.cat.clothes",
    category: "Одяг",
    flag: "🇩🇪",
    rating: 4.8,
  },
  {
    id: "2",
    nameKey: "shop.demo.foodKit",
    name: "Продуктовий набір",
    price: 45,
    currency: DEMO_CURRENCY,
    categoryKey: "product.cat.food",
    category: "Їжа",
    flag: "🇵🇱",
    rating: 4.9,
  },
  {
    id: "3",
    nameKey: "shop.demo.firstAid",
    name: "Аптечка перша допомога",
    price: 28,
    currency: DEMO_CURRENCY,
    categoryKey: "product.cat.meds",
    category: "Ліки",
    flag: "🇩🇪",
    rating: 4.7,
  },
  {
    id: "4",
    nameKey: "shop.demo.backpack",
    name: "Шкільний рюкзак",
    price: 52,
    currency: DEMO_CURRENCY,
    categoryKey: "product.cat.education",
    category: "Освіта",
    flag: "🇦🇹",
    rating: 4.6,
  },
  {
    id: "5",
    nameKey: "shop.demo.bedding",
    name: "Ковдра та постільна білизна",
    price: 39,
    currency: DEMO_CURRENCY,
    categoryKey: "product.cat.household",
    category: "Побут",
    flag: "🇩🇪",
    rating: 4.8,
  },
  {
    id: "6",
    nameKey: "shop.demo.simCard",
    name: "Телефонна картка (30 днів)",
    price: 15,
    currency: DEMO_CURRENCY,
    categoryKey: "product.cat.connectivity",
    category: "Зв'язок",
    flag: "🇺🇦",
    rating: 4.5,
  },
];

const ShopCatalogPage = () => {
  const navigate = useNavigate();
  const { t } = useT();
  const { formatIn } = useCurrency();
  const { listProducts } = useProducts();
  const [live, setLive] = useState<CatalogCard[] | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const rows = await listProducts();
      if (!alive) return;
      setLive(
        rows.slice(0, 6).map((p) => ({
          id: p.id,
          name: p.title,
          price: p.price_cents / 100,
          currency: p.currency || DEMO_CURRENCY,
          category: p.category || "",
          flag: p.seller_country === "Україна" ? "🇺🇦" : "🏳️",
          rating: Number(p.seller_rating) || 0,
        }))
      );
    })();
    return () => {
      alive = false;
    };
    // listProducts — обёртка над supabase, новая на каждый рендер; тянуть её
    // в зависимости значило бы перезапрашивать каталог бесконечно.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDemo = !live || live.length === 0;
  const products: CatalogCard[] = isDemo ? demoProducts : live;

  return (
    <main className="min-h-screen bg-background">
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <ShoppingBag className="w-8 h-8 text-accent" strokeWidth={1.75} />
          <h1 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">
            {t("shop.catalogTitle", "Гуманітарний магазин")}
          </h1>
        </div>
        <p className="text-muted-foreground mb-4 leading-relaxed">
          {t(
            "shop.catalogSubtitle",
            "Товари від верифікованих організацій. Безпосередня допомога без посередників."
          )}
        </p>
        {/* Пока в базе нет ни одного активного товара — говорим прямо, что ниже
            примеры категорий, а не живые позиции. */}
        {isDemo && (
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed p-3 rounded-2xl bg-secondary">
            {t(
              "shop.catalogDemoNotice",
              "Активних товарів поки немає — нижче приклади того, що з’являтиметься в каталозі. Замовити їх не можна."
            )}
          </p>
        )}
        {!isDemo && <div className="mb-8" />}
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
                <div
                  className={`${isHero ? "h-40" : "h-24"} bg-secondary/60 flex items-center justify-center relative`}
                >
                  <ShoppingBag
                    className={`${isHero ? "w-12 h-12" : "w-8 h-8"} text-muted-foreground/20`}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="absolute top-2 left-2 text-base bg-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {p.flag}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {p.categoryKey ? t(p.categoryKey, p.category) : p.category}
                  </p>
                  <p className={`font-semibold text-foreground mb-1 ${isHero ? "text-base" : "text-sm"}`}>
                    {p.nameKey ? t(p.nameKey, p.name) : p.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{formatIn(p.price, p.currency)}</span>
                    {p.rating > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-warning text-warning" strokeWidth={1.75} />
                        {p.rating}
                      </span>
                    )}
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
          {t("shop.registerToOrder", "Зареєструватись для замовлення")}{" "}
          <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
        </Button>
      </section>
    </main>
  );
};
export default ShopCatalogPage;
