import { useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Heart, ShoppingCart, Star, Shield, Truck, RotateCcw, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/Confetti";
import { tap, notify } from "@/lib/native";

const product = {
  name: "Дитячий одяг (пакет)",
  category: "Одяг",
  price: 35,
  rating: 4.8,
  reviews: 24,
  sold: 156,
  seller: { name: "Hilfreich e.V.", flag: "🇩🇪", verified: true, rating: 4.9 },
  description: "Пакет включає: 3 футболки, 2 штани, 1 светр для дітей 4–8 років. Нові речі, зібрані волонтерами у Берліні спеціально для гуманітарних потреб.",
  includes: ["3 футболки (розм. 110–128)", "2 штани (розм. 110–128)", "1 светр", "Безкоштовна доставка до пункту видачі"],
};

const ProductDetail = () => {
  const navigate = useNavigate();
  void useParams();
  const reduced = useReducedMotion();
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2500);
    return () => clearTimeout(t);
  }, [added]);

  const handleAdd = () => {
    void tap("medium");
    void notify("success");
    setAdded(true);
  };

  return (
    <main className="pb-24 relative">
      <Confetti trigger={added && !reduced} />
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">Товар</h2>
        <motion.button
          onClick={() => { void tap("light"); setLiked((l) => !l); }}
          whileTap={{ scale: 0.85 }}
          aria-label={liked ? "Прибрати з обраних" : "В обрані"}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <motion.span layoutId="product-like" className="inline-flex">
            <Heart className={`w-5 h-5 ${liked ? "fill-accent text-accent" : "text-muted-foreground"}`} strokeWidth={1.75} />
          </motion.span>
        </motion.button>
      </div>

      <div className="relative h-56 bg-secondary/60 mx-4 rounded-2xl flex items-center justify-center mb-4 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
        <ShoppingCart className="w-16 h-16 text-muted-foreground/20" strokeWidth={1.75} aria-hidden="true" />
      </div>

      <div className="px-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
          <h1 className="font-serif text-4xl tracking-tight text-foreground mb-2 animate-fade-in">{product.name}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-warning text-warning" strokeWidth={1.75} />
              <span className="text-sm font-medium text-foreground">{product.rating}</span>
              <span className="text-xs text-muted-foreground">({product.reviews} відгуків)</span>
            </div>
            <span className="text-xs text-muted-foreground">· {product.sold} продано</span>
          </div>
        </div>

        <div className="relative flex items-center justify-between p-4 bg-secondary rounded-2xl overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
          <div>
            <p className="text-xs text-muted-foreground">Ціна</p>
            <p className="text-3xl font-bold text-foreground">€{product.price}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Продавець</p>
            <p className="text-sm font-medium text-foreground">{product.seller.name} {product.seller.flag}</p>
            {product.seller.verified && (
              <p className="text-xs text-success inline-flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3" strokeWidth={1.75} /> Верифіковано
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">Опис</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">Що входить:</p>
          <div className="space-y-2">
            {product.includes.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

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
              <div key={g.label} className="relative flex flex-col items-center gap-1 p-3 bg-secondary rounded-2xl overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
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
          className="flex-1 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          onClick={() => { void tap("light"); navigate("/app/chats"); }}
        >
          Написати продавцю
        </Button>
        <Button
          className={`flex-1 min-h-[44px] transition-transform duration-150 hover:-translate-y-px ${added ? "bg-success hover:bg-success/90" : "bg-accent hover:bg-accent/90"} text-white`}
          onClick={handleAdd}
        >
          {added ? (
            <motion.span
              initial={reduced ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="inline-flex items-center gap-1"
            >
              <Check className="w-4 h-4" strokeWidth={2} /> Додано
            </motion.span>
          ) : "Замовити"}
        </Button>
      </div>
    </main>
  );
};
export default ProductDetail;
