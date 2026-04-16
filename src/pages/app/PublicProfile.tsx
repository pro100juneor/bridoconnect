import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Heart, Star, MapPin, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useReviews } from "@/hooks/useReviews";

const MOCK_PROFILE = {
  id:"u1", name:"Оксана К.", city:"Харків", country:"Україна", bio:"Мама двох дітей з Харкова. Будинок пошкоджений після обстрілу.",
  verified:true, rating:4.8, deals_count:12, total_helped:3200,
};

const PublicProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const { reviews } = useReviews(id);

  useEffect(() => {
    if (!id) return;
    supabase.from("profiles").select("*").eq("id", id).single()
      .then(({ data }) => setProfile(data || MOCK_PROFILE));
  }, [id]);

  const p = profile || MOCK_PROFILE;
  const flag = p.country === "Україна" ? "🇺🇦" : "🏳️";

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Профіль</h2>
      </div>

      <div className="px-4 pb-6 border-b border-border">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0 overflow-hidden">
            {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" /> : p.name.slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground">{p.name} {flag}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <MapPin className="w-3 h-3" /> {p.city}{p.country ? `, ${p.country}` : ""}
            </div>
            {p.verified && (
              <div className="flex items-center gap-1 text-xs text-success mb-2">
                <Shield className="w-3 h-3" /> Верифіковано
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-warning text-warning" />{p.rating}</span>
              <span>{p.deals_count} угод</span>
            </div>
          </div>
        </div>

        {p.bio && <p className="text-sm text-foreground mb-4">{p.bio}</p>}

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[{v:`€${(p.total_helped||0).toLocaleString()}`, l:"Отримано"},{v:`${p.rating||0}★`,l:"Рейтинг"},{v:p.deals_count||0,l:"Угод"}].map((s: any)=>(
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

      {reviews.length > 0 && (
        <div className="px-4 py-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-warning" /> Відгуки ({reviews.length})
          </h3>
          <div className="space-y-3">
            {reviews.slice(0, 5).map(r => (
              <div key={r.id} className="p-3 rounded-xl bg-secondary">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{r.reviewer?.name || "Анонім"}</span>
                  <div className="flex items-center gap-1">
                    {[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-warning text-warning" />)}
                  </div>
                </div>
                {r.text && <p className="text-xs text-muted-foreground">{r.text}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default PublicProfile;
