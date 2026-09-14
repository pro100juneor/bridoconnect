import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/i18n/useT";
import {
  BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  convertAmount,
  formatMoney,
  metaFor,
  normalizeCode,
  rateOf,
  type FxRate,
} from "@/lib/money";

export type CurrencyRate = FxRate;

const LS_KEY = "brido-currency";

/**
 * Стан валюти живе в модульному store, а не в стані окремого хука: інакше
 * перемикач у налаштуваннях міняв валюту лише «для себе», а вже відкриті
 * екрани показували стару. Тепер будь-яка зміна (курс завантажився, юзер
 * перемкнув валюту) перемальовує всіх підписників.
 */
interface CurrencySnapshot {
  code: string;
  rates: FxRate[];
  /** true — курси реально приїхали з currency_rates. */
  ratesReady: boolean;
}

function initialCode(): string {
  try {
    return normalizeCode(localStorage.getItem(LS_KEY) || BASE_CURRENCY);
  } catch {
    return BASE_CURRENCY;
  }
}

let snapshot: CurrencySnapshot = { code: initialCode(), rates: [], ratesReady: false };
const listeners = new Set<() => void>();
// Явний вибір користувача в цій сесії. Потрібен, щоб (можливо застаріле)
// читання профілю не перебило свіжий вибір при переході між екранами.
let sessionChoice: string | null = null;
let ratesPromise: Promise<void> | null = null;

function emit(next: Partial<CurrencySnapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CurrencySnapshot {
  return snapshot;
}

/** Курси тягнемо рівно один раз на сесію — вони оновлюються раз на добу (pg_cron). */
function loadRates(): Promise<void> {
  if (ratesPromise) return ratesPromise;
  ratesPromise = (async () => {
    const { data, error } = await supabase.from("currency_rates").select("code, rate_per_eur, symbol");
    const rows = (data ?? []) as { code: string; rate_per_eur: number | string; symbol: string }[];
    if (error || rows.length === 0) {
      // Курсів немає — не вигадуємо їх. Суми показуються у своїй валюті без конвертації.
      ratesPromise = null;
      return;
    }
    emit({
      rates: rows.map((r) => ({
        code: normalizeCode(r.code),
        rate_per_eur: Number(r.rate_per_eur),
        symbol: r.symbol || metaFor(r.code).symbol,
      })),
      ratesReady: true,
    });
  })();
  return ratesPromise;
}

export interface MoneyView {
  /** Сума у валюті відображення (або у вихідній, якщо конвертація неможлива). */
  amount: number;
  /** Код валюти, в якій насправді показано число. */
  currency: string;
  formatted: string;
  /** false — курсу не було, показано оригінальну валюту без конвертації. */
  converted: boolean;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  /** Курс до EUR або null, поки таблиця не завантажилась. */
  rate: number | null;
  /** false — конвертувати нічим, вибір валюти нічого не змінить. */
  available: boolean;
}

export const useCurrency = () => {
  const { user } = useAuth();
  const { localeTag } = useT();
  const { code, rates, ratesReady } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void loadRates();
  }, []);

  // Залогінені: бажана валюта лежить у профілі.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("preferred_currency")
        .eq("id", user.id)
        .maybeSingle();
      if (!alive) return;
      // Профіль застосовуємо тільки при першій появі на цьому пристрої (локального
      // вибору ще немає). Якщо вибір є — він головніший навіть після перезавантаження.
      if (sessionChoice) return;
      try {
        if (localStorage.getItem(LS_KEY)) return;
      } catch {
        return;
      }
      const pref = (data as { preferred_currency?: string | null } | null)?.preferred_currency;
      if (!pref) return;
      emit({ code: normalizeCode(pref) });
      try {
        localStorage.setItem(LS_KEY, normalizeCode(pref));
      } catch {
        // storage недоступний — вибір діє в межах сесії
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const meta = metaFor(code);

  /** Список валют для перемикача: метадані + чи є для них живий курс. */
  const list = useMemo<CurrencyOption[]>(
    () =>
      SUPPORTED_CURRENCIES.map((c) => {
        const rate = rateOf(rates, c.code);
        return { code: c.code, symbol: c.symbol, rate, available: rate !== null };
      }),
    [rates]
  );

  /**
   * Головний хелпер: сума у мажорних одиницях + її власна валюта → вигляд у
   * валюті відображення. Якщо курсу немає — повертаємо оригінал (converted: false),
   * а не вигадану цифру.
   */
  const money = useCallback(
    (amount: number, from: string | null | undefined = BASE_CURRENCY): MoneyView => {
      const source = normalizeCode(from);
      const target = normalizeCode(code);
      const value = Number(amount) || 0;

      if (source === target) {
        return { amount: value, currency: target, formatted: formatMoney(value, target, { localeTag }), converted: true };
      }

      const converted = convertAmount(value, source, target, rates);
      if (converted === null) {
        return {
          amount: value,
          currency: source,
          formatted: formatMoney(value, source, { localeTag }),
          converted: false,
        };
      }
      return {
        amount: converted,
        currency: target,
        formatted: formatMoney(converted, target, { localeTag }),
        converted: true,
      };
    },
    [code, rates, localeTag]
  );

  /** Те саме, але для мінорних одиниць (products.price_cents тощо). */
  const convert = useCallback(
    (minorUnits: number, from: string | null | undefined = BASE_CURRENCY): MoneyView =>
      money((Number(minorUnits) || 0) / 100, from),
    [money]
  );

  /** Коротка форма, коли потрібен лише рядок. */
  const format = useCallback(
    (amount: number, from: string | null | undefined = BASE_CURRENCY): string => money(amount, from).formatted,
    [money]
  );

  /** Форматування без конвертації — коли треба показати суму саме в її валюті. */
  const formatIn = useCallback(
    (amount: number, currency: string | null | undefined): string =>
      formatMoney(Number(amount) || 0, currency, { localeTag }),
    [localeTag]
  );

  /**
   * Прогрес по угоді. Важливо: deals.amount заявлено в deals.currency (користувач
   * обирає EUR/USD/UAH при створенні), а deals.raised завжди в EUR — усі чеки
   * виставляються в EUR (create-checkout). Раніше обидва числа малювались з «€»,
   * через що ціль у 40 000 UAH виглядала як €40 000, а відсоток був беззмістовним.
   * Тут ціль нормалізується в EUR за живим курсом, і лише потім усе переводиться
   * у валюту відображення.
   */
  const dealProgress = useCallback(
    (amount: number, currency: string | null | undefined, raised: number) => {
      const goalEur = convertAmount(Number(amount) || 0, currency, BASE_CURRENCY, rates);
      const raisedEur = Number(raised) || 0;
      const pct = goalEur && goalEur > 0 ? Math.round((raisedEur / goalEur) * 100) : 0;
      return {
        // Курсу немає → показуємо ціль у її власній валюті, нічого не вигадуючи.
        goal: goalEur === null ? money(Number(amount) || 0, currency) : money(goalEur, BASE_CURRENCY),
        raised: money(raisedEur, BASE_CURRENCY),
        pct,
        /** false — ціль в іншій валюті, а курсу нема: відсоток рахувати нічим. */
        comparable: goalEur !== null,
      };
    },
    [rates, money]
  );

  const setCurrency = useCallback(
    async (next: string) => {
      const normalized = normalizeCode(next);
      sessionChoice = normalized;
      emit({ code: normalized });
      try {
        localStorage.setItem(LS_KEY, normalized);
      } catch {
        // storage недоступний — вибір діє в межах сесії
      }
      if (user) {
        await supabase.from("profiles").update({ preferred_currency: normalized }).eq("id", user.id);
      }
    },
    [user]
  );

  return {
    list,
    code: meta.code,
    symbol: meta.symbol,
    rates,
    ratesReady,
    money,
    convert,
    format,
    formatIn,
    dealProgress,
    setCurrency,
  };
};
