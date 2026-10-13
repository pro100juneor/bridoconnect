# Прод-накат миграций 049–059 (D-001) — выполняет ВЛАДЕЛЕЦ вручную

**Статус: НЕ применено на прод. Применять только по осознанному решению владельца.**
Агент прод-БД напрямую не трогает (RULES_DETAILED §1.5 + нет прод-кредов + запрет на секреты).
Этот файл — готовый план, чтобы накат был у владельца в несколько команд.

## 0. Перед накатом — ОБЯЗАТЕЛЬНО

1. **Бэкап прод-БД** (Supabase Dashboard → Database → Backups, либо `pg_dump`). Миграции необратимы.
2. **fx-cron landmine (025):** `supabase/migrations/025_fx_cron.sql` хардкодит STAGING-проект
   `mlgyuonypcyseryrmcms` (URL + anon-ключ). Это НЕ входит в диапазон 049–059, но если крон
   настраивается на прод — заменить на прод-ref `wtevirwkshidxskqpvtu` и прод-anon-ключ. Иначе
   ежедневный refresh FX будет бить в staging. (025 обёрнут в exception — накат не падает.)
3. Проверить, какие миграции уже применены на прод (могли быть накачены ранее). Диапазон ниже —
   то, что накатывалось в этой сессии ТОЛЬКО локально.

## 1. Что накатывается (порядок строгий — по номерам)

Ремедиация аудита и перестройка маркетплейса:

- `049_audit_hardening_batch1.sql`, `050_consent_write_enforcement.sql`,
  `051_account_deletion_fk.sql`, `052_release_after_refund_guard.sql`,
  `053_money_accounting_fixes.sql`, `054_user_blocks.sql`, `055_deal_updates.sql`
- `056_merchant_role.sql` — роль merchant, заявки, RLS-гейт магазина, RPC решения по заявке.
- `057_gift_orders.sql` — shipping_addresses, orders(+подарок), RLS-приватность адреса,
  RPC order_shipping_for_merchant / merchant_update_fulfillment.
- `058_recipient_has_address.sql` — RPC-пречек наличия адреса (boolean).
- `059_gift_notifications.sql` — типы notifications + триггер уведомлений о подарке.

## 2. Команды (psql против прод; подставить прод-строку подключения)

```bash
# PGURL — строка подключения к ПРОД Supabase (взять в кабинете владельца; НЕ коммитить).
# Накат по одному файлу, с остановкой на первой ошибке.
cd /Users/Alexey/bridoconnect
for n in 049_audit_hardening_batch1 050_consent_write_enforcement 051_account_deletion_fk \
         052_release_after_refund_guard 053_money_accounting_fixes 054_user_blocks \
         055_deal_updates 056_merchant_role 057_gift_orders 058_recipient_has_address \
         059_gift_notifications; do
  echo "== $n =="
  psql "$PGURL" -v ON_ERROR_STOP=1 -1 -f "supabase/migrations/${n}.sql" || { echo "FAILED at $n"; break; }
done
```

`-1` оборачивает каждый файл в транзакцию (откат файла при ошибке внутри него). Если какой-то
файл уже применён и выдаёт конфликт — большинство миграций идемпотентны (`if not exists` /
`drop policy if exists`), но свериться по выводу.

## 3. После наката

- Проверить RLS подарков на прод так же, как локально (роль authenticated + jwt-claims): мерчант
  видит адрес заказа, спонсор/посторонний — нет; бенефициар видит заказ без адреса.
- Edge-функции (create-checkout/stripe-webhook/connect-onboard) задеплоить отдельно (D-003):
  правки P4.3/P5.1 внесены, но платёжный путь верифицируется на sandbox-ключах.
