import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ArrowLeft, MessageCircle, Heart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MOCK_FAVORITES = [
  { id:"u1", name:"Оксана К.", country:"Україна", city:"Харків", rating:4.8, deals_count:12, tags:["Житло","Гроші"], verified:true },
  { id:"u2", name:"Марія Л.", country:"Україна", city:"Київ", rating:4.9, deals_count:23, tags:["Ліки","Діти"], verified:true },
  { id:"u3", name:"Ahmad R.", country:"Сирія", city:"Берлін", rating:4.5, deals_count:7, tags:["Їжа","Одяг"], verified:true },
];

const Wishlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setFavorites(MOCK_FAVORITES); setLoading(false); return; }
    // Load wishlist from profiles the user has interacted with
    supabase.from("deals")
      .select("creator_id, profiles!creator_id(id, name, city, country, rating, deals_count, verified)")
      .eq("sponsor_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const unique = Array.from(new Map(data.map((d: any) => [d.creator_id, d.profiles])).values()).filter(Boolean);
          setFavorites(unique.length > 0 ? unique : MOCK_FAVORITES);
        } else {
          setFavorites(MOCK_FAVORITES);
        }
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Обрані виконавці</h2>
        <span className="text-xs text-muted-foreground">{favorites.length}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {favorites.map((f: any) => {
            const flag = f.country === "Україна" ? "🇺🇦" : "🏳️";
            const initials = (f.name || "??").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={f.id} className="flex items-center gap-3 p-4 rounded-xl border border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/app/user/${f.id}`)}>
                  {f.avatar_url ? <img src={f.avatar_url} className="w-full h-full object-cover" alt="" /> : initials}
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/app/user/${f.id}`)}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{f.name} {flag}</span>
                    {f.verified && <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded">✓</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{f.city || "—"}</span>
                    <Star className="w-3 h-3 fill-warning text-warning" />
                    <span>{f.rating || "—"} · {f.deals_count || 0} угод</span>
                  </div>
                  {f.tags && (
                    <div className="flex gap-1 mt-1">
                      {(f.tags || []).map((tag: string) => (
                        <span key={tag} className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => navigate(`/app/chat/${f.id}`)} className="p-2 bg-primary/10 rounded-lg">
                    <MessageCircle className="w-4 h-4 text-primary" />
                  </button>
                  <button onClick={() => setFavorites(prev => prev.filter(x => x.id !== f.id))} className="p-2 bg-destructive/10 rounded-lg">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            );
          })}
          {favorites.length === 0 && (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Ще немає обраних виконавців</p>
              <button onClick={() => navigate("/app/search")} className="text-accent text-sm font-medium mt-2">
                Знайти виконавців →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default Wishlist;
