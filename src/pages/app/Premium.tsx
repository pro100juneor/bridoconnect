import { useState } from "react";
import { Crown, Check, Zap, Shield, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStripe } from "@/hooks/useStripe";
import { toast } from "@/hooks/use-toast";
import { Confetti } from "@/components/Confetti";
import { tap, notify } from "@/lib/native";
import { useT } from "@/i18n/useT";
import { useCurrency } from "@/hooks/useCurrency";

/** Пара «ключ словаря + украинский оригинал» — текст константы переводится в рендере. */
interface Phrase {
  key: string;
  fallback: string;
}

interface Plan {
  id: string;
  name: Phrase;
  /** Цена в EUR: подписку Stripe списывает строго в евро (create-checkout). */
  priceEur: number;
  period: Phrase;
  priceId: string;
  features: Phrase[];
  popular: boolean;
  badge?: Phrase;
}

const FEATURE_NO_FEE: Phrase = { key: "premium.feature.noFee", fallback: "Без комісії" };
const FEATURE_PRIORITY: Phrase = { key: "premium.feature.priority", fallback: "Пріоритет у стрічці" };
const FEATURE_VERIFIED: Phrase = { key: "premium.feature.verified", fallback: "Значок верифікації" };
const FEATURE_ANALYTICS: Phrase = { key: "premium.feature.analytics", fallback: "Розширена аналітика" };

const plans: Plan[] = [
  {
    id: "monthly",
    name: { key: "premium.plan.monthly.name", fallback: "Місячна" },
    priceEur: 4.99,
    period: { key: "premium.plan.monthly.period", fallback: "/ місяць" },
    priceId: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || "price_monthly",
    features: [FEATURE_NO_FEE, FEATURE_PRIORITY, FEATURE_VERIFIED, FEATURE_ANALYTICS],
    popular: false,
  },
  {
    id: "yearly",
    name: { key: "premium.plan.yearly.name", fallback: "Річна" },
    priceEur: 39.99,
    period: { key: "premium.plan.yearly.period", fallback: "/ рік" },
    badge: { key: "premium.plan.yearly.badge", fallback: "Економія 33%" },
    priceId: import.meta.env.VITE_STRIPE_PRICE_YEARLY || "price_yearly",
    features: [
      FEATURE_NO_FEE,
      FEATURE_PRIORITY,
      FEATURE_VERIFIED,
      FEATURE_ANALYTICS,
      { key: "premium.feature.support", fallback: "Підтримка 24/7" },
      { key: "premium.feature.exclusive", fallback: "Ексклюзивний доступ" },
    ],
    popular: true,
  },
];

const perks = [
  {
    icon: Zap,
    title: { key: "premium.perk.noFee.title", fallback: "Без комісії" },
    desc: { key: "premium.perk.noFee.desc", fallback: "100% коштів йде одержувачу" },
    hero: true,
  },
  {
    icon: TrendingUp,
    title: { key: "premium.perk.priority.title", fallback: "Пріоритет" },
    desc: { key: "premium.perk.priority.desc", fallback: "Ваші запити вгорі стрічки" },
  },
  {
    icon: Shield,
    title: { key: "premium.perk.verified.title", fallback: "Верифікація" },
    desc: { key: "premium.perk.verified.desc", fallback: "Золотий значок довіри" },
  },
  {
    icon: Star,
    title: { key: "premium.perk.analytics.title", fallback: "Аналітика" },
    desc: { key: "premium.perk.analytics.desc", fallback: "Детальна статистика угод" },
  },
];

const Premium = () => {
  const { t } = useT();
  // Цена подписки списывается в EUR, поэтому показываем её именно в EUR (formatIn),
  // а не в валюте отображения — иначе пользователь увидит не ту сумму, что спишут.
  const { formatIn } = useCurrency();
  const { createSubscription } = useStripe();
  const [loading, setLoading] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const handleSubscribe = async (plan: Plan) => {
    void tap("medium");
    setLoading(plan.id);
    try {
      // Не празднуем до оплаты: подтверждение приходит после возврата со Stripe.
      await createSubscription({ priceId: plan.priceId });
      void notify("success");
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2500);
    } catch (e) {
      void notify("error");
      setCelebrate(false);
      toast({
        title: t("premium.errorTitle", "Stripe не підключено"),
        description:
          (e instanceof Error ? e.message : "") ||
          t("premium.errorDesc", "Підписку буде активовано після налаштування Stripe у адмін-панелі."),
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  return (
    <main className="pb-8 relative">
      <Confetti trigger={celebrate} />
      <section className="px-4 pt-6 pb-8 text-white text-center" style={{ background: "hsl(222 47% 22%)" }}>
        <Crown className="w-12 h-12 mx-auto mb-3 text-warning" strokeWidth={1.75} />
        <h1 className="font-serif text-4xl tracking-tight mb-2 animate-fade-in">
          {t("premium.title", "BridoConnect Premium")}
        </h1>
        <p className="text-white/70 text-sm leading-relaxed">
          {t("premium.subtitle", "Максимум довіри. Мінімум комісій.")}
        </p>
      </section>

      <div className="px-4 -mt-4">
        {/* DESIGN.md §Anti-patterns: break symmetric 2-col — first perk spans full width as hero */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {perks.map((perk) => (
            <article
              key={perk.title.key}
              className={`relative bg-background rounded-2xl p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 ${
                perk.hero ? "col-span-2" : ""
              }`}
            >
              <perk.icon
                className={`${perk.hero ? "w-7 h-7" : "w-5 h-5"} text-accent mb-2`}
                strokeWidth={1.75}
              />
              <p className={`font-semibold text-foreground ${perk.hero ? "text-base" : "text-sm"}`}>
                {t(perk.title.key, perk.title.fallback)}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(perk.desc.key, perk.desc.fallback)}
              </p>
            </article>
          ))}
        </div>

        <div className="space-y-3 mb-6">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`relative p-4 rounded-2xl border-2 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 ${
                plan.popular ? "border-accent bg-accent/5" : "border-border bg-background"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{t(plan.name.key, plan.name.fallback)}</p>
                    {plan.badge && (
                      <span className="text-[10px] bg-accent text-white px-1.5 py-0.5 rounded font-medium">
                        {t(plan.badge.key, plan.badge.fallback)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">
                      {formatIn(plan.priceEur, "eur")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t(plan.period.key, plan.period.fallback)}
                    </span>
                  </div>
                </div>
                {plan.popular && <Crown className="w-5 h-5 text-warning" strokeWidth={1.75} />}
              </div>
              <div className="space-y-1.5 mb-4">
                {plan.features.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" strokeWidth={1.75} />
                    <span className="text-xs text-foreground">{t(f.key, f.fallback)}</span>
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
                  t("premium.opening", "Відкриваємо…")
                ) : plan.popular ? (
                  <span className="inline-flex items-center gap-2">
                    <Crown className="w-4 h-4" strokeWidth={1.75} />
                    {t("premium.chooseYearly", "Обрати річний план")}
                  </span>
                ) : (
                  t("premium.chooseMonthly", "Обрати місячний")
                )}
              </Button>
            </article>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          {t("premium.footer", "Скасувати підписку можна будь-коли. Безпечна оплата через Stripe.")}
        </p>
      </div>
    </main>
  );
};

export default Premium;
