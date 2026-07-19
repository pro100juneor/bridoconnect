import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CurrencyRate {
  code: string;
  rate_per_eur: number;
  symbol: string;
}

// Fallback used before the currency_rates table loads (or if it is unreachable).
// Kept in sync with migration 022_shop_rules.sql seed.
const FALLBACK_RATES: CurrencyRate[] = [
  { code: "eur", rate_per_eur: 1.0, symbol: "€" },
  { code: "usd", rate_per_eur: 1.08, symbol: "$" },
  { code: "uah", rate_per_eur: 45.0, symbol: "₴" },
  { code: "pln", rate_per_eur: 4.3, symbol: "zł" },
  { code: "gbp", rate_per_eur: 0.85, symbol: "£" },
  { code: "czk", rate_per_eur: 25.0, symbol: "Kč" },
];

// Currencies conventionally displayed without minor units.
const ZERO_DECIMAL = new Set(["uah", "czk"]);
const LS_KEY = "brido-currency";

// Process-wide cache — rates rarely change within a session.
let ratesCache: CurrencyRate[] | null = null;

export const useCurrency = () => {
  const { user } = useAuth();
  const [rates, setRates] = useState<CurrencyRate[]>(ratesCache ?? FALLBACK_RATES);
  const [code, setCode] = useState<string>(() => localStorage.getItem(LS_KEY) || "eur");

  // Load rates once (cached).
  useEffect(() => {
    if (ratesCache) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.from("currency_rates" as any).select("code, rate_per_eur, symbol");
      if (!alive || !data || (data as any[]).length === 0) return;
      ratesCache = (data as any[]).map((r) => ({
        code: r.code,
        rate_per_eur: Number(r.rate_per_eur),
        symbol: r.symbol,
      }));
      setRates(ratesCache);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Logged-in users: preferred currency lives on their profile.
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
      const pref = (data as any)?.preferred_currency;
      if (pref) {
        setCode(pref);
        localStorage.setItem(LS_KEY, pref);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const current =
    rates.find((r) => r.code === code) ?? rates.find((r) => r.code === "eur") ?? FALLBACK_RATES[0];

  // Convert an EUR minor-unit amount to the selected currency for display.
  const convert = useCallback(
    (eurCents: number): { amount: number; formatted: string } => {
      const zero = ZERO_DECIMAL.has(current.code);
      const value = (eurCents / 100) * current.rate_per_eur;
      const amount = zero ? Math.round(value) : Math.round(value * 100) / 100;
      const formatted = `${current.symbol}${zero ? String(amount) : amount.toFixed(2)}`;
      return { amount, formatted };
    },
    [current]
  );

  const setCurrency = useCallback(
    async (next: string) => {
      setCode(next);
      localStorage.setItem(LS_KEY, next);
      if (user) {
        await supabase
          .from("profiles")
          .update({ preferred_currency: next } as any)
          .eq("id", user.id);
      }
    },
    [user]
  );

  return {
    list: rates,
    code: current.code,
    symbol: current.symbol,
    convert,
    setCurrency,
  };
};
