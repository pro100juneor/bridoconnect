import { useState } from "react";
import { Crown, Check, Zap, Shield, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStripe } from "@/hooks/useStripe";
import { toast } from "@/hooks/use-toast";
import { Confetti } from "@/components/Confetti";
import { tap, notify } from "@/lib/native";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  priceId: string;
  features: string[];
  popular: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: "monthly",
    name: "Місячна",
    price: "€4.99",
    period: "/ місяць",
    priceId: (import.meta as any).env?.VITE_STRIPE_PRICE_MONTHLY || "price_monthly",
    features: ["Без комісії", "Пріоритет у стрічці", "Значок верифікації", "Розширена аналітика"],
    popular: false,
  },
  {
    id: "yearly",
    name: "Річна",
    price: "€39.99",
    period: "/ рік",
    badge: "Економія 33%",
    priceId: (import.meta as any).env?.VITE_STRIPE_PRICE_YEARLY || "price_yearly",
    features: [
      "Без комісії",
      "Пріоритет у стрічці",
      "Значок верифікації",
      "Розширена аналітика",
      "Підтримка 24/7",
      "Ексклюзивний доступ",
    ],
    popular: true,
  },
];

const perks = [
  { icon: Zap, title: "Без комісії", desc: "100% коштів йде одержувачу", hero: true },
  { icon: TrendingUp, title: "Пріоритет", desc: "Ваші запити вгорі стрічки" },
  { icon: Shield, title: "Верифікація", desc: "Золотий значок довіри" },
  { icon: Star, title: "Аналітика", desc: "Детальна статистика угод" },
];

const Premium = () => {
  const { createSubscription } = useStripe();
  const [loading, setLoading] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const handleSubscribe = async (plan: Plan) => {
    void tap("medium");
    setLoading(plan.id);
    try {
      void notify("success");
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2500);
      await createSubscription({ priceId: plan.priceId });
    } catch (e: any) {
      void notify("error");
      setCelebrate(false);
      toast({
        title: "Stripe не підключено",
        description:
          e?.message ||
          "Підписку буде активовано після налаштування Stripe у адмін-панелі.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  return (
    <main className="pb-8 relative">
      <Confetti trigger={celebrate} />
      <section
        className="px-4 pt-6 pb-8 text-white text-center"
        style={{ background: "hsl(222 47% 22%)" }}
      >
        <Crown className="w-12 h-12 mx-auto mb-3 text-warning" strokeWidth={1.75} />
        <h1 className="font-serif text-4xl tracking-tight mb-2 animate-fade-in">BridoConnect Premium</h1>
        <p className="text-white/70 text-sm leading-relaxed">Максимум довіри. Мінімум комісій.</p>
      </section>

      <div className="px-4 -mt-4">
        {/* DESIGN.md §Anti-patterns: break symmetric 2-col — first perk spans full width as hero */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {perks.map((perk) => (
            <article
              key={perk.title}
              className={`relative bg-background rounded-2xl p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 ${
                perk.hero ? "col-span-2" : ""
              }`}
            >
              <perk.icon className={`${perk.hero ? "w-7 h-7" : "w-5 h-5"} text-accent mb-2`} strokeWidth={1.75} />
              <p className={`font-semibold text-foreground ${perk.hero ? "text-base" : "text-sm"}`}>{perk.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{perk.desc}</p>
            </article>
          ))}
        </div>

        <div className="space-y-3 mb-6">
          {plans.map(plan => (
            <article
              key={plan.id}
              className={`relative p-4 rounded-2xl border-2 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 ${
                plan.popular ? "border-accent bg-accent/5" : "border-border bg-background"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{plan.name}</p>
                    {plan.badge && (
                      <span className="text-[10px] bg-accent text-white px-1.5 py-0.5 rounded font-medium">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                {plan.popular && <Crown className="w-5 h-5 text-warning" strokeWidth={1.75} />}
              </div>
              <div className="space-y-1.5 mb-4">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" strokeWidth={1.75} />
                    <span className="text-xs text-foreground">{f}</span>
                  </div>
                ))}
              </div>
              <Button
                className={`w-full min-h-[44px] transition-transform duration-150 hover:-translate-y-px ${
                  plan.popular
                    ? "bg-accent hover:bg-accent/90 text-white"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
                disabled={loading === plan.id}
                onClick={() => handleSubscribe(plan)}
              >
                {loading === plan.id ? (
                  "Відкриваємо…"
                ) : plan.popular ? (
                  <span className="inline-flex items-center gap-2">
                    <Crown className="w-4 h-4" strokeWidth={1.75} />
                    Обрати річний план
                  </span>
                ) : (
                  "Обрати місячний"
                )}
              </Button>
            </article>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Скасувати підписку можна будь-коли. Безпечна оплата через Stripe.
        </p>
      </div>
    </main>
  );
};

export default Premium;
