import { useNavigate } from "react-router-dom";
import { Star, ArrowLeft, MessageCircle } from "lucide-react";

const favorites = [
  { id: "1", name: "Оксана К.", flag: "🇺🇦", city: "Харків", rating: 4.8, deals: 12, category: "Житло", verified: true },
  { id: "2", name: "Марія Л.", flag: "🇺🇦", city: "Київ", rating: 4.9, deals: 23, category: "Ліки", verified: true },
  { id: "3", name: "Ahmad R.", flag: "🏳️", city: "Берлін", rating: 4.5, deals: 7, category: "Їжа", verified: true },
  { id: "4", name: "Fatima H.", flag: "🏳️", city: "Відень", rating: 4.7, deals: 9, category: "Гроші", verified: true },
];

const Wishlist = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Обрані виконавці</h2>
        <span className="text-xs text-muted-foreground">{favorites.length}</span>
      </div>
      <div className="px-4 py-4 space-y-3">
        {favorites.map(f => (
          <div key={f.id} className="flex items-center gap-3 p-4 rounded-xl border border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {f.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{f.name} {f.flag}</span>
                {f.verified && <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded">✓</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{f.city}</span>
                <Star className="w-3 h-3 fill-warning text-warning" />
                <span>{f.rating} · {f.deals} угод · {f.category}</span>
              </div>
            </div>
            <button onClick={() => navigate(`/app/chat/${f.id}`)} className="p-2 bg-primary/10 rounded-lg">
              <MessageCircle className="w-5 h-5 text-primary" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Wishlist;
