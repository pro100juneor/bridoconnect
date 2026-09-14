/**
 * Джерело правди для поточної мови — модульний store (а не стан одного хука).
 *
 * Чому store, а не просто useState всередині useT: раніше кожен виклик useT()
 * створював власний стан, тому перемикач мови в налаштуваннях міняв локаль
 * лише для себе — решта відкритих екранів лишалась старою мовою до перезавантаження.
 * Тепер локаль одна на застосунок, а компоненти підписуються через
 * useSyncExternalStore (див. useT.ts / LocaleProvider.tsx).
 */

export type Locale = "uk" | "en" | "de";

export const LOCALES: Locale[] = ["uk", "en", "de"];

/** BCP-47 теги для Intl.* (числа, дати, валюти). */
export const LOCALE_TAG: Record<Locale, string> = {
  uk: "uk-UA",
  en: "en-GB",
  de: "de-DE",
};

export const LOCALE_STORAGE_KEY = "brido_locale";

export function isLocale(value: unknown): value is Locale {
  return value === "uk" || value === "en" || value === "de";
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return "uk";
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    // приватний режим / заблокований storage — падаємо на мову браузера
  }
  if (isLocale(stored)) return stored;
  const browser = (navigator.language || "uk").slice(0, 2).toLowerCase();
  if (browser === "en") return "en";
  if (browser === "de") return "de";
  return "uk";
}

let current: Locale = detectLocale();
const listeners = new Set<() => void>();
let storageBound = false;

function emit() {
  for (const listener of listeners) listener();
}

/** Синхронізація між вкладками: зміна мови в одній вкладці застосовується в усіх. */
function bindStorage() {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  window.addEventListener("storage", (e) => {
    if (e.key !== LOCALE_STORAGE_KEY) return;
    if (isLocale(e.newValue) && e.newValue !== current) {
      current = e.newValue;
      emit();
    }
  });
}

export function getLocale(): Locale {
  return current;
}

/** Серверний/статичний снапшот для useSyncExternalStore. */
export function getServerLocale(): Locale {
  return current;
}

export function setLocale(next: Locale) {
  if (!isLocale(next) || next === current) return;
  current = next;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    // ігноруємо — мова все одно застосується в межах сесії
  }
  emit();
}

export function subscribeLocale(listener: () => void): () => void {
  bindStorage();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
