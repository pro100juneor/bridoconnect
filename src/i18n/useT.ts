import { useCallback, useContext, useSyncExternalStore } from "react";
import { DICTS } from "./dictionaries";
import { LocaleContext } from "./LocaleProvider";
import {
  LOCALE_TAG,
  getLocale,
  getServerLocale,
  setLocale as setLocaleGlobal,
  subscribeLocale,
  type Locale,
} from "./locales";

export type { Locale };
export { LOCALES, LOCALE_TAG } from "./locales";

export type TranslateVars = Record<string, string | number>;

/** Підстановка {name} у рядок словника. */
function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

export type TFunction = (key: string, fallback?: string, vars?: TranslateVars) => string;

/**
 * Легкий i18n-хук — JSON-словники, без важкого рантайму.
 * Повертає t(key, fallback?, vars?), поточну локаль і сеттер.
 *
 * Реактивність: локаль живе в модульному store (i18n/locales.ts), компонент
 * підписується на неї через useSyncExternalStore. Перемикання мови одразу
 * перемальовує всі відкриті екрани — перезавантаження не потрібне.
 *
 * Fallback: якщо ключа немає в словнику — береться fallback, інакше сам ключ.
 * Тому міграцію можна робити поступово: <p>Допоміг</p> → <p>{t("profile.helped", "Допоміг")}</p>.
 */
export const useT = () => {
  const ctx = useContext(LocaleContext);
  const storeLocale = useSyncExternalStore(subscribeLocale, getLocale, getServerLocale);
  const locale = ctx?.locale ?? storeLocale;
  const setLocale = ctx?.setLocale ?? setLocaleGlobal;

  const t = useCallback<TFunction>(
    (key, fallback, vars) => interpolate(DICTS[locale]?.[key] ?? fallback ?? key, vars),
    [locale]
  );

  return { t, locale, setLocale, localeTag: LOCALE_TAG[locale] };
};
