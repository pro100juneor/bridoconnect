/**
 * Єдиний хелпер для грошей.
 *
 * Правила:
 *  - База зберігання — EUR. Усі Stripe-чеки по угодах/донатах виставляються в EUR
 *    (create-checkout: currency: "eur"), тому deals.raised, wallet-баланс і
 *    total_helped — це EUR.
 *  - У deals.currency / products.currency лежить валюта, в якій *заявлена* сума.
 *    Її не можна мовчки читати як EUR — саме це й було «фіктивною валютою».
 *  - Курси беруться тільки з таблиці public.currency_rates (її наповнює
 *    edge-функція refresh-fx-rates з живого фіду). Ніяких зашитих коефіцієнтів:
 *    якщо курсу немає — конвертація не робиться, сума показується у своїй
 *    валюті (чесно), а не множиться на вигаданий множник.
 */

export interface FxRate {
  code: string;
  /** Скільки одиниць цієї валюти дає 1 EUR. */
  rate_per_eur: number;
  symbol: string;
}

export interface CurrencyMeta {
  code: string;
  symbol: string;
  /** Скільки знаків після коми показувати (конвенція відображення застосунку). */
  decimals: number;
}

/**
 * Валюти, які вміє показувати застосунок. Це лише метадані (символ, розрядність),
 * курсів тут свідомо немає — вони приходять з БД.
 * Набір збігається з CURRENCIES у supabase/functions/refresh-fx-rates.
 */
export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: "eur", symbol: "€", decimals: 2 },
  { code: "usd", symbol: "$", decimals: 2 },
  { code: "uah", symbol: "₴", decimals: 0 },
  { code: "pln", symbol: "zł", decimals: 2 },
  { code: "gbp", symbol: "£", decimals: 2 },
  { code: "czk", symbol: "Kč", decimals: 0 },
];

export const BASE_CURRENCY = "eur";

export function normalizeCode(code: string | null | undefined): string {
  return (code || BASE_CURRENCY).trim().toLowerCase();
}

export function metaFor(code: string | null | undefined): CurrencyMeta {
  const normalized = normalizeCode(code);
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === normalized) ?? {
      code: normalized,
      symbol: normalized.toUpperCase(),
      decimals: 2,
    }
  );
}

export function symbolFor(code: string | null | undefined): string {
  return metaFor(code).symbol;
}

/** Курс валюти до EUR або null, якщо його немає в завантаженій таблиці. */
export function rateOf(rates: FxRate[], code: string | null | undefined): number | null {
  const normalized = normalizeCode(code);
  if (normalized === BASE_CURRENCY) return 1;
  const row = rates.find((r) => normalizeCode(r.code) === normalized);
  if (!row) return null;
  const value = Number(row.rate_per_eur);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Сума у валюті `from` → EUR. null, якщо курсу немає. */
export function toEur(amount: number, from: string | null | undefined, rates: FxRate[]): number | null {
  const rate = rateOf(rates, from);
  if (rate === null || !Number.isFinite(amount)) return null;
  return amount / rate;
}

/** EUR → сума у валюті `to`. null, якщо курсу немає. */
export function fromEur(eurAmount: number, to: string | null | undefined, rates: FxRate[]): number | null {
  const rate = rateOf(rates, to);
  if (rate === null || !Number.isFinite(eurAmount)) return null;
  return eurAmount * rate;
}

/** Крос-конвертація через EUR. null, якщо бракує будь-якого з курсів. */
export function convertAmount(
  amount: number,
  from: string | null | undefined,
  to: string | null | undefined,
  rates: FxRate[]
): number | null {
  if (normalizeCode(from) === normalizeCode(to)) return amount;
  const eur = toEur(amount, from, rates);
  if (eur === null) return null;
  return fromEur(eur, to, rates);
}

export interface FormatMoneyOptions {
  /** BCP-47 тег для Intl (uk-UA / en-GB / de-DE). */
  localeTag?: string;
  /** Перевизначити кількість знаків після коми. */
  decimals?: number;
  /** true — округлити до цілого (компактні картки, підсумки). */
  round?: boolean;
}

/**
 * Форматує суму в *мажорних* одиницях у зазначеній валюті.
 * Одна точка входу на весь застосунок — щоб символ, розрядність і роздільники
 * не роз'їжджались між екранами.
 */
export function formatMoney(
  amount: number,
  code: string | null | undefined,
  options: FormatMoneyOptions = {}
): string {
  const meta = metaFor(code);
  const safe = Number.isFinite(amount) ? amount : 0;
  const decimals = options.round ? 0 : (options.decimals ?? meta.decimals);
  const localeTag = options.localeTag || "uk-UA";

  let digits: string;
  try {
    digits = new Intl.NumberFormat(localeTag, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(safe);
  } catch {
    digits = safe.toFixed(decimals);
  }

  // Символи-суфікси (zł, Kč) читабельніші після числа; решта — префіксом.
  return meta.symbol.length > 1 ? `${digits} ${meta.symbol}` : `${meta.symbol}${digits}`;
}

/** Мінорні одиниці (cents) → відформатований рядок у тій самій валюті. */
export function formatMinor(
  minor: number,
  code: string | null | undefined,
  options: FormatMoneyOptions = {}
): string {
  return formatMoney((Number(minor) || 0) / 100, code, options);
}
