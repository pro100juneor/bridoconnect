-- 014_profile_column_security.sql — REVERTED
-- Audit F finding: processor account IDs (stripe_connect_account_id,
-- paypal_merchant_id, adyen_account_holder_code) видимы публично через
-- profiles_select using(true).
--
-- Попытка ограничить через REVOKE SELECT + GRANT SELECT(col,...) сломала
-- все select("*") в кодовой базе (PostgREST шлёт *, требует table-wide select).
-- Правильное решение — создать view profiles_public + рефакторить читателей
-- + хранить sensitive cols в отдельной таблице profile_payment_accounts.
--
-- TODO(audit-F): отдельный PR на этот рефактор. Текущая экспозиция —
-- information disclosure (P2): атакующий может узнать `acct_XXX` ID других
-- пользователей. Не позволяет вывести деньги, но может использоваться для
-- targeted phishing. Mitigation плана нет до рефактора.

-- noop, чтобы миграция не падала при db reset
select 1;
