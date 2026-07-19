import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingCart, Star, Shield, Truck, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { tap, notify } from "@/lib/native";
import { useProducts, Product } from "@/hooks/useProducts";
import { useStripe } from "@/hooks/useStripe";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "@/hooks/use-toast";

const flagFor = (country?: string | null) => (country === "Україна" ? "🇺🇦" : "🏳️");

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getProduct } = useProducts();
  const { buyProduct } = useStripe();
  const { add } = useCart();
  const { code, convert } = useCurrency();
  const [liked, setLiked] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getProduct(id).then((p) => {
      if (alive) {
        setProduct(p);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onboarded = product?.seller_connect_status === "enabled";
  const available = product?.status === "active" && (product?.stock ?? 0) > 0;

  const handleBuy = async () => {
    if (!id || !product) return;
    void tap("medium");
    setPaying(true);
    try {
      await buyProduct({ productId: id, currency: code });
    } catch (e) {
      void notify("error");
      alert(e instanceof Error ? e.message : "Не вдалося почати оплату");
      setPaying(false);
    }
  };

  const handleAddToCart = () => {
    if (!id || !product) return;
    void tap("light");
    add({
      productId: id,
      sellerId: product.seller_id,
      title: product.title,
      priceCents: product.price_cents,
      image: product.images[0],
    });
    toast({ title: "Додано в кошик" });
  };

  if (loading) {
    return <main className="pb-24 px-4 pt-8 text-center text-sm text-muted-foreground">Завантаження…</main>;
  }

  if (!product) {
    return (
      <main className="pb-24 px-4 pt-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">Товар не знайдено</p>
        <Button variant="outline" onClick={() => navigate("/app/shop")}>
          До магазину
        </Button>
      </main>
    );
  }

  return (
    <main className="pb-24 relative">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">Товар</h2>
        <button
          onClick={() => {
            void tap("light");
            setLiked((l) => !l);
          }}
          aria-label={liked ? "Прибрати з обраних" : "В обрані"}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Heart
            className={`w-5 h-5 ${liked ? "fill-accent text-accent" : "text-muted-foreground"}`}
            strokeWidth={1.75}
          />
        </button>
      </div>

      <div className="relative h-56 bg-secondary/60 mx-4 rounded-2xl flex items-center justify-center mb-4 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
        {product.images[activeImage] ? (
          <img
            src={product.images[activeImage]}
            alt={product.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <ShoppingCart
            className="w-16 h-16 text-muted-foreground/20"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
      </div>

      {product.images.length > 1 && (
        <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide snap-x">
          {product.images.map((src, i) => (
            <button
              key={src}
              onClick={() => {
                void tap("light");
                setActiveImage(i);
              }}
              aria-label={`Фото ${i + 1}`}
              className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden snap-start transition-all duration-150 ${
                i === activeImage ? "ring-2 ring-accent" : "opacity-70"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {product.videos.length > 0 && (
        <div className="px-4 mb-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Відео</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x">
            {product.videos.map((src) => (
              <video
                key={src}
                src={src}
                controls
                playsInline
                preload="metadata"
                className="shrink-0 w-64 h-40 rounded-2xl bg-black object-cover snap-start"
              />
            ))}
          </div>
        </div>
      )}

      <div className="px-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{product.category || "Товар"}</p>
          <h1 className="font-serif text-4xl tracking-tight text-foreground mb-2 animate-fade-in">
            {product.title}
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-warning text-warning" strokeWidth={1.75} />
              <span className="text-sm font-medium text-foreground">
                {(product.seller_rating ?? 0).toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">· {product.stock} в наявності</span>
          </div>
        </div>

        <div className="relative flex items-center justify-between p-4 bg-secondary rounded-2xl overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
          <div>
            <p className="text-xs text-muted-foreground">Ціна</p>
            <p className="text-3xl font-bold text-foreground">{convert(product.price_cents).formatted}</p>
          </div>
          <button
            onClick={() => {
              void tap("light");
              navigate(`/app/shop/seller/${product.seller_id}`);
            }}
            className="text-right"
          >
            <p className="text-xs text-muted-foreground">Продавець</p>
            <p className="text-sm font-medium text-foreground">
              {product.seller_name} {flagFor(product.seller_country)}
            </p>
            {product.seller_verified && (
              <p className="text-xs text-success inline-flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3" strokeWidth={1.75} /> Верифіковано
              </p>
            )}
          </button>
        </div>

        {product.description && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Опис</p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}

        {!onboarded && (
          <div className="p-3 rounded-2xl bg-warning/10 border border-warning/20">
            <p className="text-xs text-warning font-medium">
              Продавець ще не завершив підключення Stripe. Оплата стане доступною після верифікації.
            </p>
          </div>
        )}

        {/* DESIGN.md §Anti-patterns: break symmetric 3-col — first guarantee anchor */}
        <div className="space-y-2">
          <div className="relative flex items-center gap-3 p-3 bg-secondary rounded-2xl overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
            <Shield className="w-6 h-6 text-accent shrink-0" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-foreground">Захист BridoConnect</p>
              <p className="text-xs text-muted-foreground">Гроші повертаються якщо щось пішло не так</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Truck, label: "Безкоштовна доставка" },
              { icon: RotateCcw, label: "Повернення 14 днів" },
            ].map((g) => (
              <div
                key={g.label}
                className="relative flex flex-col items-center gap-1 p-3 bg-secondary rounded-2xl overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
              >
                <g.icon className="w-5 h-5 text-accent" strokeWidth={1.75} />
                <p className="text-xs text-muted-foreground text-center">{g.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/85 backdrop-blur-md border-t border-border flex gap-3">
        <Button
          variant="outline"
          aria-label="Додати в кошик"
          className="min-h-[44px] min-w-[44px] px-3 transition-transform duration-150 hover:-translate-y-px"
          disabled={!available}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="w-4 h-4" strokeWidth={1.75} />
        </Button>
        <Button
          variant="outline"
          className="flex-1 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          onClick={() => {
            void tap("light");
            navigate("/app/chats");
          }}
        >
          Написати
        </Button>
        <Button
          className="flex-1 min-h-[44px] transition-transform duration-150 hover:-translate-y-px bg-accent hover:bg-accent/90 text-white"
          disabled={paying || !onboarded || !available}
          onClick={handleBuy}
        >
          {paying ? "Оплата…" : !available ? "Немає" : "Купити"}
        </Button>
      </div>
    </main>
  );
};
export default ProductDetail;
