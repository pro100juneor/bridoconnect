import { useNavigate } from "react-router-dom";
import {
  Settings, Edit2, Heart, Star, CreditCard, Award, BarChart3, Crown,
  ArrowRight, LogOut, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { tap } from "@/lib/native";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading } = useProfile();

  const handleSignOut = async () => {
    void tap("medium");
    await signOut();
    navigate("/auth");
  };

  const goEdit = () => {
    void tap("light");
    navigate("/app/profile/edit");
  };

  const initials = profile?.name
    ? profile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "??";

  if (loading) {
    // DESIGN.md §Loading: skeleton, not spinner for >500ms.
    return (
      <div>
        <h1 className="sr-only">Профіль</h1>
        <div className="px-4 pt-4 pb-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-secondary animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-secondary animate-pulse rounded w-2/3" />
              <div className="h-3 bg-secondary animate-pulse rounded w-1/2" />
            </div>
          </div>
          <div className="h-20 bg-secondary animate-pulse rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-secondary animate-pulse rounded-2xl" />
            <div className="h-16 bg-secondary animate-pulse rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="sr-only">Профіль</h1>
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">Профіль</h2>
          <button
            onClick={() => { void tap("light"); navigate("/app/settings"); }}
            aria-label="Налаштування"
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground">{profile?.name || "Користувач"}</h3>
            <p className="text-xs text-muted-foreground">
              {profile?.country ? `${profile.country} · ` : ""}{profile?.role === "recipient" ? "Отримувач" : "Спонсор"}
            </p>
            {profile?.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] text-success mt-1">
                <CheckCircle2 strokeWidth={1.75} className="w-3.5 h-3.5" aria-hidden="true" />
                Верифіковано
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="ml-auto min-h-[44px] min-w-[44px] transition-transform duration-150 hover:-translate-y-px"
            onClick={goEdit}
            aria-label="Редагувати"
          >
            <Edit2 className="w-4 h-4" strokeWidth={1.75} />
          </Button>
        </div>

        {/* DESIGN.md §Anti-patterns: break symmetric 3-col — hero number on top, supporting stats below */}
        <div className="space-y-3">
          <div className="relative bg-secondary rounded-2xl p-4 text-center before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:rounded-t-2xl">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Допоміг</span>
            <span className="font-serif text-3xl tracking-tight text-foreground">
              €{(profile?.total_helped || 0).toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: String(profile?.deals_count || 0), label: "Угод" },
              { value: profile?.rating ? profile.rating.toFixed(1) + "★" : "—", label: "Рейтинг" },
            ].map((stat) => (
              <div key={stat.label} className="relative bg-secondary rounded-2xl p-3 text-center before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:rounded-t-2xl">
                <span className="block text-lg font-bold text-foreground">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-2 pb-4">
        {[
          { icon: Heart, label: "Активні угоди", color: "text-accent", path: "/app/deals" },
          { icon: Star, label: "Обрані виконавці", color: "text-warning", path: "/app/wishlist" },
          { icon: CreditCard, label: "Гаманець", color: "text-primary", path: "/app/wallet" },
          { icon: Award, label: "Верифікація", color: "text-success", path: "/verification" },
          { icon: Crown, label: "Premium підписка", color: "text-warning", path: "/app/premium" },
          { icon: BarChart3, label: "Налаштування", color: "text-primary", path: "/app/settings" },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => { void tap("light"); navigate(item.path); }}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border min-h-[44px] hover:bg-secondary/50 hover:-translate-y-px transition-all duration-150"
          >
            <item.icon className={`w-5 h-5 ${item.color}`} strokeWidth={1.75} />
            <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
          </button>
        ))}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-destructive/20 min-h-[44px] hover:bg-destructive/5 hover:-translate-y-px transition-all duration-150 mt-2"
        >
          <LogOut className="w-5 h-5 text-destructive" strokeWidth={1.75} />
          <span className="text-sm font-medium text-destructive flex-1 text-left">Вийти з акаунту</span>
        </button>
      </div>
    </div>
  );
};
export default Profile;
