import { useEffect, useState } from "react";
import uk from "./dictionaries/uk.json";
import en from "./dictionaries/en.json";
import de from "./dictionaries/de.json";

export type Locale = "uk" | "en" | "de";

const DICTS: Record<Locale, Record<string, string>> = { uk, en, de };
const STORAGE_KEY = "brido_locale";

function detectLocale(): Locale {
  if (typeof window === "undefined") return "uk";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "uk" || stored === "en" || stored === "de") return stored;
  const browser = (navigator.language || "uk").slice(0, 2).toLowerCase();
  if (browser === "en") return "en";
  if (browser === "de") return "de";
  return "uk";
}

/**
 * Lightweight i18n hook — JSON dictionaries, no heavy runtime.
 * Returns t(key, fallback?) and current locale + setter.
 *
 * Migration path: components currently use hardcoded Ukrainian strings.
 * Replace gradually: <p>Допоміг</p> → <p>{t("profile.helped")}</p>.
 */
export const useT = () => {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = (l: Locale) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
    }
    setLocaleState(l);
  };

  const t = (key: string, fallback?: string): string => {
    return DICTS[locale][key] ?? fallback ?? key;
  };

  return { t, locale, setLocale };
};
