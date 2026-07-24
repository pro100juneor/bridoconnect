import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Check } from "lucide-react";
import { usePromotions } from "@/hooks/usePromotions";
import { useToast } from "@/hooks/use-toast";

interface TierOption {
  tier: 1 | 2 | 3;
  price: string;
  hours: number;
  label: string;
  perks: string[];
}

// Prices mirror create-checkout TIER_PRICE (€5 / €15 / €50). The edge function is
// the source of truth for the actual charge; these are display-only.
const TIERS: TierOption[] = [
  {
    tier: 1,
    price: "€5",
    hours: 24,
    label: "Базовий",
    perks: ["24 години у стрічці", "Показ у каруселі", "Гарантія топ-групи 3 хв"],
  },
  {
    tier: 2,
    price: "€15",
    hours: 72,
    label: "Розширений",
    perks: ["72 години у стрічці", "Вищий пріоритет", "Гарантія топ-групи 3 хв"],
  },
  {
    tier: 3,
    price: "€50",
    hours: 168,
    label: "Максимальний",
    perks: ["7 днів у стрічці", "Найвищий пріоритет", "Гарантія топ-групи 3 хв"],
  },
];

const PromoteMe = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { startPromotion } = usePromotions();
  const [selected, setSelected] = useState<1 | 2 | 3>(2);
  const [headline, setHeadline] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      await startPromotion({ tier: selected, headline: headline.trim() || undefined });
      // On success the browser redirects to Stripe Checkout; nothing else to do.
    } catch (e) {
      setLoading(false);
      toast({
        title: "Помилка оплати",
        description: e instanceof Error ? e.message : "Спробуйте пізніше",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="pb-8">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-serif text-xl text-foreground">Просувати себе</h2>
      </div>

      <div className="px-4">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-primary/5 p-4 mb-5">
          <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Платне розміщення виводить ваш профіль угору головної стрічки та в карусель. Що більший рівень —
            то вищий пріоритет і довший показ.
          </p>
        </div>

        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="promo-headline">
          Заголовок (необовʼязково)
        </label>
        <input
          id="promo-headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value.slice(0, 80))}
          placeholder="Напр.: Потрібна підтримка для родини"
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground mb-5 outline-none focus:ring-2 focus:ring-accent/40"
        />

        <div className="space-y-3 mb-6">
          {TIERS.map((opt) => {
            const isSel = selected === opt.tier;
            return (
              <button
                key={opt.tier}
                onClick={() => setSelected(opt.tier)}
                className={`w-full text-left rounded-2xl border p-4 transition-all ${
                  isSel
                    ? "border-accent ring-2 ring-accent/30 bg-accent/5"
                    : "border-border bg-card hover:-translate-y-px"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-foreground">{opt.label}</span>
                  <span className="text-lg font-bold text-foreground">{opt.price}</span>
                </div>
                <ul className="space-y-1">
                  {opt.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full rounded-xl bg-accent text-white font-semibold py-3 transition-opacity disabled:opacity-60"
        >
          {loading ? "Перенаправлення…" : "Оплатити та розмістити"}
        </button>
        <p className="text-[11px] text-muted-foreground text-center mt-3">
          Гарантія показу у верхній групі стрічки — щонайменше 3 хвилини після оплати.
        </p>
      </div>
    </div>
  );
};

export default PromoteMe;
