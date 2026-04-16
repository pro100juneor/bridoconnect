import { useState } from "react";
import { ShoppingBag, Star, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStripe } from "@/hooks/useStripe";

const products = [
  { id:"1", name:"Дитячий одяг (пакет)", price:35, category:"Одяг", flag:"🇩🇪", rating:4.8, reviews:24, sold:156 },
  { id:"2", name:"Продуктовий набір на тиждень", price:45, category:"Їжа", flag:"🇵🇱", rating:4.9, reviews:87, sold:342 },
  { id:"3", name:"Аптечка перша допомога", price:28, category:"Ліки", flag:"🇩🇪", rating:4.7, reviews:31, sold:98 },
  { id:"4", name:"Шкільний рюкзак з приладдям", price:52, category:"Освіта", flag:"🇦🇹", rating:4.6, reviews:19, sold:67 },
  { id:"5", name:"Ковдра та постільна білизна", price:39, category:"Побут", flag:"🇩🇪", rating:4.8, reviews:42, sold:211 },
  { id:"6", name:"Телефонна картка (30 днів)", price:15, category:"Зв'язок", flag:"🇺🇦", rating:4.5, reviews:63, sold:445 },
];

const cats = ["Всі","Їжа","Одяг","Ліки","Освіта","Побут","Зв'язок"];

const Shop = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState("Всі");
  const [liked, setLiked] = useState<string[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const { createCheckout } = useStripe();

  const filtered = active === "Всі" ? products : products.filter(p => p.category === active);

  const handleBuy = async (p: typeof products[0]) => {
    setBuying(p.id);
    try { await createCheckout({ amount: p.price }); } catch { setBuying(null); }
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-serif text-xl text-foreground mb-3">Гуманітарний магазин</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map(cat => (
            <button key={cat} onClick={() => setActive(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active===cat?"bg-accent text-white":"bg-secondary text-foreground"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 grid grid-cols-2 gap-3">
        {filtered.map(p => (
          <div key={p.id} className="rounded-xl border border-border overflow-hidden cursor-pointer"
            onClick={() => navigate(`/app/shop/${p.id}`)}>
            <div className="h-28 bg-secondary/60 flex items-center justify-center relative">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
              <button onClick={e => { e.stopPropagation(); setLiked(l => l.includes(p.id) ? l.filter(x=>x!==p.id) : [...l,p.id]); }}
                className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full">
                <Heart className={`w-4 h-4 ${liked.includes(p.id)?"fill-accent text-accent":"text-muted-foreground"}`} />
              </button>
              <span className="absolute top-2 left-2 text-xs bg-white/80 px-1.5 py-0.5 rounded text-foreground">{p.flag}</span>
            </div>
            <div className="p-3">
              <p className="text-xs text-muted-foreground mb-1">{p.category}</p>
              <p className="text-sm font-semibold text-foreground leading-tight mb-2 line-clamp-2">{p.name}</p>
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-3 h-3 fill-warning text-warning" />
                <span className="text-xs text-muted-foreground">{p.rating} ({p.reviews})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">€{p.price}</span>
                <button onClick={e => { e.stopPropagation(); handleBuy(p); }}
                  disabled={buying === p.id}
                  className="text-xs bg-accent text-white px-2.5 py-1 rounded-lg font-medium disabled:opacity-60">
                  {buying===p.id?"...":"Купити"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Shop;
