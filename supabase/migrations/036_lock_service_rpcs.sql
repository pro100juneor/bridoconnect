-- 036: закрытие критической дыры — сервисные SECURITY DEFINER RPC были
-- вызываемы любым залогиненным пользователем через PostgREST /rpc:
--   * apply_stripe_payment и семейство apply_* — без всякой авторизации:
--     накрутка raised + назначение себя sponsor_id любой сделки;
--   * release_escrow(3-арг) — p_caller_id подделывается клиентом;
--   * increment_raised (legacy 008) — прямая накрутка сумм без проверок;
--   * release_escrow(2-арг, legacy 008) — обход статусных guard'ов 013.
-- Эти функции предназначены только для edge-функций (service_role).

-- 1. Legacy-перегрузки из 008 — удалить совсем.
drop function if exists public.increment_raised(uuid, numeric);
drop function if exists public.release_escrow(uuid, text);

-- 2. Отозвать выполнение сервисных RPC у клиентских ролей.
--    service_role обходит эти проверки и продолжает работать.
revoke execute on function public.release_escrow(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.increment_raised_idempotent(uuid, numeric, text, text) from public, anon, authenticated;
revoke execute on function public.apply_stripe_payment(uuid, numeric, text, uuid) from public, anon, authenticated;
revoke execute on function public.apply_paypal_payment(uuid, numeric, text, uuid) from public, anon, authenticated;
revoke execute on function public.apply_dlocal_payment(uuid, numeric, text, uuid) from public, anon, authenticated;
revoke execute on function public.apply_crypto_payment(uuid, numeric, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.increment_stream_raised(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.decrement_stock(uuid) from public, anon, authenticated;
revoke execute on function public.edge_rate_limit_hit(text, timestamptz, integer) from public, anon, authenticated;
revoke execute on function public.edge_rate_limits_cleanup() from public, anon, authenticated;
revoke execute on function public.country_to_iso2(text) from public, anon, authenticated;

-- Клиентские RPC остаются доступны: active_promotions, generate_profile_slug,
-- generate_shop_slug, has_profile_access, trust_score, is_admin (нужен RLS-политикам).
