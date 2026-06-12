import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, MessageCircle, Heart, CheckCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useReviews } from "@/hooks/useReviews";
import { toast } from "@/hooks/use-toast";
import { tap, notify } from "@/lib/native";

const TrustBadge = ({ score }: { score: number }) => {
  const tone = score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive";
  const fill = score >= 70 ? "bg-success" : score >= 40 ? "bg-warning" : "bg-destructive";
  const label =
    score >= 70 ? "Високий рівень довіри" : score >= 40 ? "Помірний рівень довіри" : "Низький рівень довіри";
  return (
    <div
      data-testid="trust-badge"
      className="relative bg-secondary rounded-2xl p-3 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
    >
      <div className="flex items-center gap-2 mb-2">
        <Shield className={`w-4 h-4 ${tone}`} strokeWidth={1.75} />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex-1 text-left">
          Trust score
        </span>
        <span className={`text-lg font-bold ${tone}`}>{score}</span>
      </div>
      <div className="w-full h-1.5 bg-background rounded-full overflow-hidden mb-1">
        <div className={`h-full ${fill} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground text-left">{label} · KYC + угоди + рейтинг + вік</p>
    </div>
  );
};

const PublicProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { reviews } = useReviews(id);
  const [profile, setProfile] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [trust, setTrust] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
        setLoading(false);
      });
    supabase
      .from("deals")
      .select("*")
      .eq("creator_id", id)
      .eq("status", "active")
      .limit(3)
      .then(({ data }) => {
        if (data) setDeals(data);
      });
    supabase.rpc("trust_score", { p_user: id }).then(({ data }) => {
      if (typeof data === "number") setTrust(data);
    });
    if (user) {
      supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("target_id", id)
        .maybeSingle()
        .then(({ data }) => setIsFav(!!data));
    }
  }, [id, user]);

  const toggleFav = async () => {
    if (!user || !id) return;
    void tap("light");
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("target_id", id);
      setIsFav(false);
      toast({ title: "Видалено з обраних" });
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, target_id: id });
      setIsFav(true);
      void notify("success");
      toast({ title: "Додано до обраних" });
    }
  };

  if (loading) {
    // DESIGN.md §Loading: skeleton — avatar + name + stats
    return (
      <div className="px-4 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary animate-pulse" />
          <div className="h-6 w-32 bg-secondary animate-pulse rounded" />
        </div>
        <div className="flex flex-col items-center py-6 gap-3">
          <div className="w-20 h-20 rounded-full bg-secondary animate-pulse" />
          <div className="h-5 w-40 bg-secondary animate-pulse rounded" />
          <div className="h-4 w-28 bg-secondary animate-pulse rounded" />
        </div>
        <div className="h-20 bg-secondary animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-secondary animate-pulse rounded-2xl" />
          <div className="h-16 bg-secondary animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile)
    return (
      <div className="text-center py-16 px-6">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="inline-flex items-center gap-2 text-muted-foreground mb-6 text-sm min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Назад
        </button>
        <p className="text-muted-foreground">Профіль не знайдено</p>
      </div>
    );

  const initials = profile.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const flag = profile.country === "Україна" ? "🇺🇦" : "🏳️";
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
      : (profile.rating || 0).toFixed(1);

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-lg text-foreground animate-fade-in">Профіль</h2>
      </div>

      <div className="px-4 py-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary mx-auto mb-3 relative">
          {initials}
          {profile.verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" strokeWidth={1.75} />
            </div>
          )}
        </div>
        <h3 className="font-semibold text-lg text-foreground">{profile.name}</h3>
        <p className="text-sm text-muted-foreground">
          {flag} {profile.city}
          {profile.city && profile.country ? ", " : ""}
          {profile.country}
        </p>
        {profile.bio && (
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">{profile.bio}</p>
        )}

        {/* DESIGN.md §Anti-patterns: break symmetric 3-col — "Допомогли" anchor, "Угод"/"Рейтинг" below */}
        <div className="mt-5 space-y-2">
          <div className="relative bg-secondary rounded-2xl px-4 py-3 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
              Допомогли
            </span>
            <span className="font-serif text-2xl tracking-tight text-foreground">
              €{(profile.total_helped || 0).toFixed(0)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative bg-secondary rounded-2xl p-3 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
              <p className="text-lg font-bold text-foreground">{profile.deals_count || 0}</p>
              <p className="text-xs text-muted-foreground">Угод</p>
            </div>
            <div className="relative bg-secondary rounded-2xl p-3 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
              <p className="text-lg font-bold text-foreground inline-flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" strokeWidth={1.75} />
                {avgRating}
              </p>
              <p className="text-xs text-muted-foreground">{reviews.length} відгуків</p>
            </div>
          </div>
          {trust !== null && <TrustBadge score={trust} />}
        </div>
      </div>

      {user && user.id !== id && (
        <div className="px-4 flex gap-3 mb-6">
          <Button
            className="flex-1 bg-accent hover:bg-accent/90 text-white gap-2 transition-transform duration-150 hover:-translate-y-px"
            onClick={() => {
              void tap("light");
              if (deals[0]) navigate(`/app/chat/${deals[0].id}`);
              else navigate(`/app/chats`);
            }}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={1.75} /> Написати
          </Button>
          <Button
            variant="outline"
            className={`gap-2 transition-transform duration-150 hover:-translate-y-px ${isFav ? "border-accent text-accent" : ""}`}
            onClick={toggleFav}
          >
            <Heart className={`w-4 h-4 ${isFav ? "fill-accent text-accent" : ""}`} strokeWidth={1.75} />
            {isFav ? "В обраних" : "Додати"}
          </Button>
        </div>
      )}

      {deals.length > 0 ? (
        <div className="px-4 mb-6">
          <h4 className="font-semibold text-sm text-foreground mb-3">Активні запити</h4>
          <div className="space-y-2">
            {deals.map((deal: any) => (
              <div
                key={deal.id}
                onClick={() => {
                  void tap("light");
                  navigate(`/app/deal/${deal.id}`);
                }}
                className="relative p-3 rounded-2xl border border-border cursor-pointer hover:bg-secondary/50 hover:-translate-y-px transition-all duration-150 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
              >
                <p className="text-sm font-medium text-foreground truncate">{deal.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full mr-3">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{ width: `${Math.min((deal.raised / deal.amount) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    €{deal.raised} / €{deal.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 mb-6">
          <h4 className="font-semibold text-sm text-foreground mb-3">Активні запити</h4>
          <div className="flex flex-col items-center py-8 gap-3">
            <svg
              viewBox="0 0 48 48"
              className="w-12 h-12 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 6h18l6 6v24a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" />
              <path d="M30 6v6h6" />
            </svg>
            <p className="text-sm text-muted-foreground">Активних запитів немає</p>
          </div>
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="px-4">
          <h4 className="font-semibold text-sm text-foreground mb-3">Відгуки ({reviews.length})</h4>
          <div className="space-y-3">
            {reviews.slice(0, 5).map((r: any) => (
              <div
                key={r.id}
                className="relative p-3 rounded-2xl border border-border overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                        strokeWidth={1.75}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("uk", { day: "numeric", month: "short" })}
                  </span>
                </div>
                {r.text && <p className="text-xs text-muted-foreground leading-relaxed">{r.text}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4">
          <h4 className="font-semibold text-sm text-foreground mb-3">Відгуки</h4>
          <div className="flex flex-col items-center py-8 gap-3">
            <svg
              viewBox="0 0 48 48"
              className="w-12 h-12 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M24 6l5.5 11 12.5 1.5-9 8.5 2.5 12-11.5-6-11.5 6 2.5-12-9-8.5L18.5 17z" />
            </svg>
            <p className="text-sm text-muted-foreground">Відгуків ще немає</p>
          </div>
        </div>
      )}
    </div>
  );
};
export default PublicProfile;
