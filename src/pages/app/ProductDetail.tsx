import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingCart, Star, Shield, Truck, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
  const { id } = useParams();
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Товар</h2>
        <button onClick={() => setLiked(l => !l)}>
          <Heart className={`w-5 h-5 ${liked ? "fill-accent text-accent" : "text-muted-foreground"}`} />
        </button>
      </div>

      <div className="h-56 bg-secondary/60 mx-4 rounded-2xl flex items-center justify-center mb-4">
        <ShoppingCart className="w-16 h-16 text-muted-foreground/20" />
      </div>

      <div className="px-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
          <h3 className="font-serif text-xl text-foreground mb-2">{product.name}</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="text-sm font-medium text-foreground">{product.rating}</span>
              <span className="text-xs text-muted-foreground">({product.reviews} відгуків)</span>
            </div>
            <span className="text-xs text-muted-foreground">· {product.sold} продано</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
          <div>
            <p className="text-xs text-muted-foreground">Ціна</p>
            <p className="text-3xl font-bold text-foreground">€{product.price}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Продавець</p>
            <p className="text-sm font-medium text-foreground">{product.seller.name} {product.seller.flag}</p>
            {product.seller.verified && <p className="text-xs text-success">✓ Верифіковано</p>}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">Опис</p>
          <p className="text-sm text-muted-foreground">{product.description}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">Що входить:</p>
          <div className="space-y-2">
            {product.includes.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Shield, label: "Захист BridoConnect" },
            { icon: Truck, label: "Безкоштовна доставка" },
            { icon: RotateCcw, label: "Повернення 14 днів" },
          ].map(g => (
            <div key={g.label} className="flex flex-col items-center gap-1 p-3 bg-secondary rounded-xl">
              <g.icon className="w-5 h-5 text-accent" />
              <p className="text-[10px] text-muted-foreground text-center">{g.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => navigate("/app/chats")}>
          Написати продавцю
        </Button>
        <Button className={`flex-1 ${added ? "bg-success hover:bg-success/90" : "bg-accent hover:bg-accent/90"} text-white`}
          onClick={() => setAdded(true)}>
          {added ? "✓ Додано" : "Замовити"}
        </Button>
      </div>
    </div>
  );
};
export default ProductDetail;
