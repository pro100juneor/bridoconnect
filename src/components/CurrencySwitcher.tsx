import { Coins } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

// Human labels for the currency codes seeded in currency_rates.
const LABELS: Record<string, string> = {
  eur: "Євро",
  usd: "Долар",
  uah: "Гривня",
  pln: "Злотий",
  gbp: "Фунт",
  czk: "Крона",
};

/**
 * Currency / region picker. Used in Settings; writes to localStorage and,
 * for logged-in users, to profiles.preferred_currency. Prices across the shop
 * re-render via useCurrency.convert().
 */
export const CurrencySwitcher = () => {
  const { list, code, setCurrency } = useCurrency();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Coins className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Валюта / Регіон</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {list.map((c) => (
          <button
            key={c.code}
            onClick={() => setCurrency(c.code)}
            className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-medium border transition-all ${
              code === c.code
                ? "bg-accent text-white border-accent"
                : "border-border text-foreground hover:bg-secondary"
            }`}
            aria-pressed={code === c.code}
          >
            <span className="mr-1">{c.symbol}</span> {LABELS[c.code] ?? c.code.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};
