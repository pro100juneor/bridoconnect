import { useState } from "react";
import { Crown, Check, Zap, Shield, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStripe } from "@/hooks/useStripe";

const plans = [
  { id: "monthly", name: "Місячна", price: "€4.99", period: "/ місяць", priceId: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || "price_monthly",
    features: ["Без комісії", "Пріоритет у стрічці", "Значок верифікації", "Розширена аналітика"], popular: false },
  { id: "yearly", name: "Річна", price: "€39.99", period: "/ рік", badge: "Економія 33%", priceId: import.meta.env.VITE_STRIPE_PRICE_YEARLY || "price_yearly",
    features: ["Без комісії", "Пріоритет у стрічці", "Значок верифікації", "Розширена аналітика", "Підтримка 24/7", "Ексклюзивний доступ"], popular: true },
];

const perks = [
  { icon: Zap, title: "Без комісії", desc: "100% коштів йде одержувачу" },
  { icon: TrendingUp, title: "Пріоритет", desc: "Ваші запити вгорі стрічки" },
  { icon: Shield, title: "Верифікація", desc: "Золотий значок довіри" },
  { icon: Star, title: "Аналітика", desc: "Детальна статистика угод" },
];

const Premium = () => {
  const { createSubscription } = useStripe();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: typeof plans[0]) => {
    setLoading(plan.id);
    try { await createSubscription(plan.priceId); } catch { setLoading(null); }
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-6 pb-8 bg-gradient-to-b from-primary to-primary/80 text-white text-center" style={{background:"hsl(222 47% 22%)"}}>
        <Crown className="w-12 h-12 mx-auto mb-3 text-warning" />
        <h2 className="font-serif text-2xl mb-2">BridoConnect Premium</h2>
        <p className="text-white/70 text-sm">Максимум довіри. Мінімум комісій.</p>
      </div>

      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {perks.map(perk => (
            <div key={perk.title} className="bg-background rounded-xl p-3 shadow-sm border border-border">
              <perk.icon className="w-5 h-5 text-accent mb-2" />
              <p className="text-sm font-semibold text-foreground">{perk.title}</p>
              <p className="text-xs text-muted-foreground">{perk.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 mb-6">
          {plans.map(plan => (
            <div key={plan.id} className={`p-4 rounded-xl border-2 ${plan.popular ? "border-accent bg-accent/5" : "border-border bg-background"}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{plan.name}</p>
                    {plan.badge && <span className="text-[10px] bg-accent text-white px-1.5 py-0.5 rounded font-medium">{plan.badge}</span>}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                {plan.popular && <Crown className="w-5 h-5 text-warning" />}
              </div>
              <div className="space-y-1.5 mb-4">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-xs text-foreground">{f}</span>
                  </div>
                ))}
              </div>
              <Button className={`w-full ${plan.popular ? "bg-accent hover:bg-accent/90 text-white" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                disabled={loading === plan.id} onClick={() => handleSubscribe(plan)}>
                {loading === plan.id ? "Відкриваємо..." : plan.popular ? "⭐ Обрати річний план" : "Обрати місячний"}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">Скасувати підписку можна будь-коли. Безпечна оплата через Stripe.</p>
      </div>
    </div>
  );
};
export default Premium;
