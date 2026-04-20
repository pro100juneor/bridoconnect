import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Heart, Star, MapPin, Shield, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Wishlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from("favorites")
      .select("id, target:profiles!target_id(id, name, city, country, rating, deals_count, verified, avatar_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setFavorites(data.map((f: any) => f.target).filter(Boolean));
        setLoading(false);
      });
  }, [user]);

  const remove = async (targetId: string) => {
    if (!user) return;
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("target_id", targetId);
    setFavorites(prev => prev.filter((f: any) => f.id !== targetId));
  };

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
      ) : favorites.length === 0 ? (
        <div className="text-center py-16 px-6">
          <Heart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Ще немає обраних виконавців</p>
          <button onClick={() => navigate("/app/search")}
            className="text-accent text-sm font-medium mt-2">
            Знайти виконавців →
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {favorites.map((f: any) => {
            const flag = f.country === "Україна" ? "🇺🇦" : "🏳️";
            const initials = (f.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={f.id} className="flex items-center gap-3 p-4 rounded-xl border border-border">
                <div onClick={() => navigate(`/app/user/${f.id}`)}
                  className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden cursor-pointer shrink-0">
                  {f.avatar_url ? <img src={f.avatar_url} className="w-full h-full object-cover" alt="" /> : initials}
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/app/user/${f.id}`)}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{f.name} {flag}</span>
                    {f.verified && (
                      <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> ✓
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {f.city && <><MapPin className="w-3 h-3" /><span>{f.city}</span></>}
                    {f.rating > 0 && <><Star className="w-3 h-3 fill-warning text-warning" /><span>{f.rating}</span></>}
                    <span>{f.deals_count || 0} угод</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => navigate(`/app/chat/${f.id}`)} className="p-2 bg-primary/10 rounded-lg">
                    <MessageCircle className="w-4 h-4 text-primary" />
                  </button>
                  <button onClick={() => remove(f.id)} className="p-2 bg-destructive/10 rounded-lg">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default Wishlist;
