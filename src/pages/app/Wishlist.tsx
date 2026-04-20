import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Star, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Wishlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("favorites")
      .select("target_id, profiles!target_id(id, name, city, country, rating, deals_count, verified, avatar_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setFavorites(data.map((f: any) => f.profiles).filter(Boolean));
        }
        setLoading(false);
      });
  }, [user]);

  const removeFavorite = async (targetId: string) => {
    if (!user) return;
    await supabase.from("favorites").delete()
      .eq("user_id", user.id).eq("target_id", targetId);
    setFavorites(prev => prev.filter((f: any) => f.id !== targetId));
    toast({ title: "Видалено з обраних" });
  };

  const getFlag = (country: string) => country === "Україна" ? "🇺🇦" : "🏳️";

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Обрані</h2>
        <button onClick={() => navigate("/app/search")} className="p-2 text-muted-foreground">
          <Search className="w-5 h-5" />
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && favorites.length === 0 && (
        <div className="text-center py-16 px-6">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-accent" />
          </div>
          <p className="font-semibold text-foreground mb-2">Список порожній</p>
          <p className="text-sm text-muted-foreground mb-4">
            Додавайте людей в обрані щоб швидко знаходити їх і допомагати.
          </p>
          <button onClick={() => navigate("/app/search")}
            className="text-sm text-accent font-semibold">
            Знайти людей →
          </button>
        </div>
      )}

      <div className="px-4 space-y-3">
        {favorites.map((person: any) => (
          <div key={person.id} className="flex items-center gap-3 p-4 rounded-xl border border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0"
              onClick={() => navigate(`/app/user/${person.id}`)}>
              {person.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0" onClick={() => navigate(`/app/user/${person.id}`)}>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm text-foreground truncate">{person.name}</p>
                {person.verified && <span className="text-xs text-accent">✓</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                {getFlag(person.country)} {person.city} · ⭐ {person.rating?.toFixed(1) || "0.0"} · {person.deals_count || 0} угод
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(`/app/chat/${person.id}`)}
                className="p-2 bg-secondary rounded-xl">
                <MessageCircle className="w-4 h-4 text-foreground" />
              </button>
              <button onClick={() => removeFavorite(person.id)}
                className="p-2 bg-accent/10 rounded-xl">
                <Heart className="w-4 h-4 text-accent fill-accent" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Wishlist;
