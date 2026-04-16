import { Button } from "@/components/ui/button";
import { Settings, Edit2, Heart, Star, CreditCard, Award, BarChart3, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-foreground">Профіль</h2>
          <button onClick={() => navigate("/app/settings")} className="p-2 text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-foreground">
            BC
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Користувач</h3>
            <p className="text-xs text-muted-foreground">🇩🇪 Німеччина · Спонсор</p>
            <span className="inline-flex items-center gap-1 text-[10px] text-success mt-1">✓ Верифіковано</span>
          </div>
          <Button variant="outline" size="icon" className="ml-auto" onClick={() => navigate("/app/profile/edit")}>
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "€1,240", label: "Допоміг" },
            { value: "18", label: "Угод" },
            { value: "12", label: "Людям" },
          ].map((stat) => (
            <div key={stat.label} className="bg-secondary rounded-lg p-3 text-center">
              <span className="block text-lg font-bold text-foreground">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="px-4 space-y-2 pb-4">
        {[
          { icon: Heart, label: "Активні угоди", badge: "3", color: "text-accent", path: "/app/deals" },
          { icon: Star, label: "Обрані виконавці", badge: "7", color: "text-warning", path: "/app/wishlist" },
          { icon: CreditCard, label: "Історія переказів", color: "text-primary", path: "/app/wallet" },
          { icon: CreditCard, label: "Платіжні методи", color: "text-foreground", path: "/app/wallet" },
          { icon: Award, label: "Досягнення", badge: "5", color: "text-success", path: "/app/profile" },
          { icon: Crown, label: "Premium підписка", color: "text-warning", path: "/app/premium" },
          { icon: BarChart3, label: "Аналітика", color: "text-primary", path: "/app/profile" },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
          >
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-semibold rounded-full">
                {item.badge}
              </span>
            )}
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Profile;
