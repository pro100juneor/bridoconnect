import { useNavigate } from "react-router-dom";
import { ShoppingBag, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const products = [
  { id:"1", name:"Дитячий одяг (пакет)", price:35, category:"Одяг", flag:"🇩🇪", rating:4.8 },
  { id:"2", name:"Продуктовий набір", price:45, category:"Їжа", flag:"🇵🇱", rating:4.9 },
  { id:"3", name:"Аптечка перша допомога", price:28, category:"Ліки", flag:"🇩🇪", rating:4.7 },
  { id:"4", name:"Шкільний рюкзак", price:52, category:"Освіта", flag:"🇦🇹", rating:4.6 },
  { id:"5", name:"Ковдра та постільна білизна", price:39, category:"Побут", flag:"🇩🇪", rating:4.8 },
  { id:"6", name:"Телефонна картка (30 днів)", price:15, category:"Зв'язок", flag:"🇺🇦", rating:4.5 },
];

const ShopCatalogPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-16 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <ShoppingBag className="w-8 h-8 text-accent" />
          <h1 className="font-serif text-3xl text-foreground">Гуманітарний магазин</h1>
        </div>
        <p className="text-muted-foreground mb-8">Товари від верифікованих організацій. Безпосередня допомога без посередників.</p>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {products.map(p=>(
            <div key={p.id} className="rounded-xl border border-border overflow-hidden">
              <div className="h-24 bg-secondary/60 flex items-center justify-center relative">
                <ShoppingBag className="w-8 h-8 text-muted-foreground/20"/>
                <span className="absolute top-2 left-2 text-base">{p.flag}</span>
              </div>
              <div className="p-3">
                <p className="text-xs text-muted-foreground mb-1">{p.category}</p>
                <p className="text-sm font-semibold text-foreground mb-1">{p.name}</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">€{p.price}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-warning text-warning"/>{p.rating}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white gap-2" onClick={() => navigate("/register")}>
          Зареєструватись для замовлення <ArrowRight className="w-4 h-4"/>
        </Button>
      </div>
    </div>
  );
};
export default ShopCatalogPage;
