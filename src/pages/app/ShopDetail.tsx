import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, MessageCircle, MapPin, Shield, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

const products = [
  { id:"1", name:"Дитячий одяг (пакет)", price:35, category:"Одяг" },
  { id:"2", name:"Продуктовий набір на тиждень", price:45, category:"Їжа" },
  { id:"3", name:"Аптечка перша допомога", price:28, category:"Ліки" },
];

const ShopDetail = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Профіль продавця</h2>
      </div>
      <div className="px-4 pb-6 border-b border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">He</div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground">Hilfreich e.V. 🇩🇪</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <MapPin className="w-3 h-3" /> Берлін, Німеччина
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-warning text-warning" />4.9</span>
              <span>156 продажів</span>
              <span className="flex items-center gap-1 text-success"><Shield className="w-3 h-3" />Верифіковано</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Благодійна організація з Берліна. Збираємо та відправляємо гуманітарну допомогу з 2022 року.</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[{v:"156",l:"Продажів"},{v:"4.9★",l:"Рейтинг"},{v:"98%",l:"Позитивних"}].map(s=>(
            <div key={s.l} className="bg-secondary rounded-xl p-3 text-center">
              <p className="font-bold text-foreground text-sm">{s.v}</p>
              <p className="text-[10px] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/app/chats")}>
          <MessageCircle className="w-4 h-4" /> Написати продавцю
        </Button>
      </div>
      <div className="px-4 pt-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-accent" /> Товари продавця ({products.length})
        </h3>
        <div className="space-y-3">
          {products.map(p => (
            <button key={p.id} onClick={() => navigate(`/app/shop/${p.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/50 text-left">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </div>
              <p className="font-bold text-foreground">€{p.price}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ShopDetail;
