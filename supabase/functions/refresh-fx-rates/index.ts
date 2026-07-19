import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Refreshes public.currency_rates from a free, key-less EUR-based FX source
// (open.er-api.com — daily rates, includes UAH which ECB does not).
// Intended to run on a daily schedule (pg_cron) but is also callable manually.
// Optional CRON_SECRET header gate to avoid casual triggering.

const CURRENCIES = ["EUR", "USD", "UAH", "PLN", "GBP", "CZK"];
const SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  UAH: "₴",
  PLN: "zł",
  GBP: "£",
  CZK: "Kč",
};

serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR");
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "fx source unavailable" }), { status: 502 });
    }
    const data = await res.json();
    const rates = data?.rates as Record<string, number> | undefined;
    if (!rates) {
      return new Response(JSON.stringify({ error: "no rates in response" }), { status: 502 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const rows = CURRENCIES.filter((c) => c === "EUR" || typeof rates[c] === "number").map((code) => ({
      code,
      rate_per_eur: code === "EUR" ? 1 : rates[code],
      symbol: SYMBOLS[code] ?? code,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("currency_rates").upsert(rows, { onConflict: "code" });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, updated: rows.length, rows }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
