import { Coins } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useT } from "@/i18n/useT";

/**
 * Перемикач валюти / регіону. Пише в localStorage і, для залогінених,
 * у profiles.preferred_currency. Ціни по всьому застосунку перераховуються
 * за курсами з public.currency_rates (їх оновлює edge-функція refresh-fx-rates).
 *
 * Валюта, для якої курс ще не завантажився, лишається неактивною — без курсу
 * конвертувати нічим, а вигадувати множник ми не хочемо.
 */
export const CurrencySwitcher = () => {
  const { list, code, setCurrency, ratesReady } = useCurrency();
  const { t } = useT();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Coins className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("settings.currency", "Валюта / Регіон")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {list.map((c) => (
          <button
            key={c.code}
            onClick={() => setCurrency(c.code)}
            disabled={!c.available}
            className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              code === c.code
                ? "bg-accent text-white border-accent"
                : "border-border text-foreground hover:bg-secondary"
            }`}
            aria-pressed={code === c.code}
          >
            <span className="mr-1">{c.symbol}</span> {t(`currency.${c.code}`, c.code.toUpperCase())}
          </button>
        ))}
      </div>
      {!ratesReady && (
        <p className="text-[11px] text-muted-foreground">
          {t("currency.rateMissing", "Курс ще не завантажено — суми показуємо у валюті оригіналу")}
        </p>
      )}
    </div>
  );
};
