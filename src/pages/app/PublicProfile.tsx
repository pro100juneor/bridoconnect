import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, MessageCircle, Heart, CheckCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useReviews } from "@/hooks/useReviews";
import { toast } from "@/hooks/use-toast";

const PublicProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { reviews } = useReviews(id);
  const [profile, setProfile] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!id) return;
    // Load profile
    supabase.from("profiles").select("*").eq("id", id).single()
      .then(({ data }) => { if (data) setProfile(data); setLoading(false); });

    // Load active deals
    supabase.from("deals").select("*").eq("creator_id", id).eq("status", "active").limit(3)
      .then(({ data }) => { if (data) setDeals(data); });

    // Check if in favorites
    if (user) {
      supabase.from("favorites")
        .select("id").eq("user_id", user.id).eq("target_id", id).maybeSingle()
        .then(({ data }) => setIsFav(!!data));
    }
  }, [id, user]);

  const toggleFav = async () => {
    if (!user || !id) return;
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("target_id", id);
      setIsFav(false);
      toast({ title: "Видалено з обраних" });
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, target_id: id });
      setIsFav(true);
      toast({ title: "Додано до обраних ❤️" });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="text-center py-16 text-muted-foreground">Профіль не знайдено</div>
  );

  const initials = profile.name?.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase();
  const flag = profile.country === "Україна" ? "🇺🇦" : "🏳️";
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
    : (profile.rating || 0).toFixed(1);

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-lg text-foreground">Профіль</h2>
      </div>

      <div className="px-4 py-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-3 relative">
          {initials}
          {profile.verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <h3 className="font-semibold text-lg text-foreground">{profile.name}</h3>
        <p className="text-sm text-muted-foreground">{flag} {profile.city}{profile.city && profile.country ? ", " : ""}{profile.country}</p>
        {profile.bio && <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{profile.bio}</p>}

        <div className="flex justify-center gap-8 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{profile.deals_count || 0}</p>
            <p className="text-xs text-muted-foreground">Угод</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">⭐ {avgRating}</p>
            <p className="text-xs text-muted-foreground">{reviews.length} відгуків</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">€{(profile.total_helped || 0).toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Допомогли</p>
          </div>
        </div>
      </div>

      {user && user.id !== id && (
        <div className="px-4 flex gap-3 mb-6">
          <Button className="flex-1 bg-accent hover:bg-accent/90 text-white gap-2"
            onClick={() => navigate(`/app/chats`)}>
            <MessageCircle className="w-4 h-4" /> Написати
          </Button>
          <Button variant="outline" className={`gap-2 ${isFav ? "border-accent text-accent" : ""}`}
            onClick={toggleFav}>
            <Heart className={`w-4 h-4 ${isFav ? "fill-accent text-accent" : ""}`} />
            {isFav ? "В обраних" : "Додати"}
          </Button>
        </div>
      )}

      {deals.length > 0 && (
        <div className="px-4 mb-6">
          <h4 className="font-semibold text-sm text-foreground mb-3">Активні запити</h4>
          <div className="space-y-2">
            {deals.map((deal: any) => (
              <div key={deal.id} onClick={() => navigate(`/app/deal/${deal.id}`)}
                className="p-3 rounded-xl border border-border cursor-pointer hover:bg-secondary/50">
                <p className="text-sm font-medium text-foreground truncate">{deal.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full mr-3">
                    <div className="h-full bg-accent rounded-full"
                      style={{ width: `${Math.min((deal.raised/deal.amount)*100, 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    €{deal.raised} / €{deal.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="px-4">
          <h4 className="font-semibold text-sm text-foreground mb-3">Відгуки ({reviews.length})</h4>
          <div className="space-y-3">
            {reviews.slice(0, 5).map((r: any) => (
              <div key={r.id} className="p-3 rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("uk", { day: "numeric", month: "short" })}
                  </span>
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
