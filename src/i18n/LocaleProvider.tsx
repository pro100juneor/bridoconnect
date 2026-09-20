import { createContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  getLocale,
  getServerLocale,
  setLocale as setLocaleGlobal,
  subscribeLocale,
  type Locale,
} from "./locales";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Провайдер мови. Підключений у App.tsx.
 *
 * Значення береться з модульного store через useSyncExternalStore — тому зміна
 * мови в будь-якому місці (перемикач у налаштуваннях, інша вкладка) миттєво
 * перемальовує всі підписані екрани без перезавантаження сторінки.
 *
 * useT() працює і без провайдера (Toaster рендериться поза <App/>), але
 * провайдер додатково тримає <html lang> у синхроні з вибраною мовою.
 */
export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getServerLocale);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale: setLocaleGlobal }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};
