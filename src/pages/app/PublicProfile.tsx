import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Heart, Star, MapPin, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const reviews = [
  { id: 1, author: "Марія Л.", flag: "🇺🇦", rating: 5, text: "Дуже надійна людина! Кошти отримала одразу, без проблем.", date: "14 кві" },
  { id: 2, author: "Юрій Т.", flag: "🇺🇦", rating: 5, text: "Справжній спонсор. Допомогла без зайвих питань.", date: "10 кві" },
  { id: 3, author: "Ahmad R.", flag: "🏳️", rating: 4, text: "Good experience, fast transfer!", date: "7 кві" },
];

const PublicProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Профіль</h2>
      </div>

      <div className="px-4 pb-6 border-b border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
            ОК
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-foreground">Оксана К. 🇺🇦</h3>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <MapPin className="w-3 h-3" /> Харків, Україна
            </div>
            <div className="flex items-center gap-1 text-xs text-success mb-2">
              <Shield className="w-3 h-3" /> Верифіковано
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-warning text-warning" /> 4.8</span>
              <span>12 угод</span>
              <span>з 2024 р.</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-foreground mb-4">Мама двох дітей з Харкова. Будинок пошкоджений після обстрілу. Шукаю тимчасове житло для сім'ї.</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[{v:"€3 200", l:"Зібрано"}, {v:"65%", l:"Прогрес"}, {v:"23", l:"Підтримали"}].map(s => (
            <div key={s.l} className="bg-secondary rounded-xl p-3 text-center">
              <p className="font-bold text-foreground">{s.v}</p>
              <p className="text-[10px] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1 bg-accent hover:bg-accent/90 text-white">
            <Heart className="w-4 h-4 mr-2" /> Підтримати
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate(`/app/chat/${id}`)}>
            <MessageCircle className="w-4 h-4 mr-2" /> Написати
          </Button>
        </div>
      </div>

      <div className="px-4 py-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-warning" /> Відгуки ({reviews.length})
        </h3>
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="p-3 rounded-xl bg-secondary">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{r.author} {r.flag}</span>
                <div className="flex items-center gap-1">
                  {[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-warning text-warning" />)}
                  <span className="text-xs text-muted-foreground ml-1">{r.date}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default PublicProfile;
