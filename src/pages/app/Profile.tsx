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
          <h2 className="font-serif text-xl text-foreground">Профиль</h2>
          <button onClick={() => navigate("/app/settings")} className="p-2 text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-foreground">
            BC
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Пользователь</h3>
            <p className="text-xs text-muted-foreground">🇩🇪 Германия · Спонсор</p>
            <span className="inline-flex items-center gap-1 text-[10px] text-success mt-1">✓ Верифицирован</span>
          </div>
          <Button variant="outline" size="icon" className="ml-auto">
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "€1,240", label: "Помог" },
            { value: "18", label: "Сделок" },
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
          { icon: Heart, label: "Активные сделки", badge: "3", color: "text-accent" },
          { icon: Star, label: "Избранные исполнители", badge: "7", color: "text-warning" },
          { icon: CreditCard, label: "История переводов", color: "text-primary" },
          { icon: CreditCard, label: "Платёжные методы", color: "text-foreground" },
          { icon: Award, label: "Достижения", badge: "5", color: "text-success" },
          { icon: Crown, label: "Premium подписка", color: "text-warning" },
          { icon: BarChart3, label: "Аналитика", color: "text-primary" },
        ].map((item) => (
          <button
            key={item.label}
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
