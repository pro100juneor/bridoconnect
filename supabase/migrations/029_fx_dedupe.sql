-- 029_fx_dedupe.sql
-- Fix currency_rates case duplication: the seed (022) used lowercase codes, but
-- refresh-fx-rates wrote UPPERCASE, creating duplicate rows. The app + checkout
-- read lowercase, so live rates were ignored. Drop any non-lowercase rows;
-- refresh-fx-rates now writes lowercase only.

delete from public.currency_rates where code <> lower(code);
