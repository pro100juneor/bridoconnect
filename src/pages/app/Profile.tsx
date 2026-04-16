import { useNavigate } from "react-router-dom";
import { Settings, Edit2, Heart, Star, CreditCard, Award, BarChart3, Crown, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading } = useProfile();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const initials = profile?.name
    ? profile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "??";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-foreground">Профіль</h2>
          <button onClick={() => navigate("/app/settings")} className="p-2 text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : initials}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{profile?.name || "Користувач"}</h3>
            <p className="text-xs text-muted-foreground">
              {profile?.country ? `${profile.country} · ` : ""}{profile?.role === "recipient" ? "Отримувач" : "Спонсор"}
            </p>
            {profile?.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] text-success mt-1">✓ Верифіковано</span>
            )}
          </div>
          <Button variant="outline" size="icon" className="ml-auto" onClick={() => navigate("/app/profile/edit")}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { value: `€${(profile?.total_helped || 0).toLocaleString()}`, label: "Допоміг" },
            { value: String(profile?.deals_count || 0), label: "Угод" },
            { value: profile?.rating ? profile.rating.toFixed(1) + "★" : "—", label: "Рейтинг" },
          ].map((stat) => (
            <div key={stat.label} className="bg-secondary rounded-lg p-3 text-center">
              <span className="block text-lg font-bold text-foreground">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
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
          <button key={item.label} onClick={() => navigate(item.path)}
            className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-destructive/20 hover:bg-destructive/5 transition-colors mt-2">
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium text-destructive flex-1 text-left">Вийти з акаунту</span>
        </button>
      </div>
    </div>
  );
};
export default Profile;
