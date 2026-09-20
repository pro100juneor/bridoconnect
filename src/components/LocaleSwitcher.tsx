import { Globe } from "lucide-react";
import { useT, type Locale } from "@/i18n/useT";

const LOCALE_OPTIONS: { value: Locale; label: string; flag: string }[] = [
  { value: "uk", label: "Українська", flag: "🇺🇦" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
];

/**
 * Мінімальний перемикач мови. Клік пише локаль у localStorage + модульний store,
 * усі підписані через useT екрани перемальовуються одразу — без перезавантаження.
 */
export const LocaleSwitcher = () => {
  const { t, locale, setLocale } = useT();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("settings.language", "Мова / Language")}
        </span>
      </div>
      <div className="flex gap-2">
        {LOCALE_OPTIONS.map((l) => (
          <button
            key={l.value}
            data-testid={`locale-${l.value}`}
            onClick={() => setLocale(l.value)}
            className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              locale === l.value
                ? "bg-accent text-white border-accent"
                : "border-border text-foreground hover:bg-secondary"
            }`}
            aria-pressed={locale === l.value}
          >
            <span className="mr-1">{l.flag}</span> {l.label}
          </button>
        ))}
      </div>
    </div>
  );
};
