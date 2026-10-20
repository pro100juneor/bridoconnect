#!/usr/bin/env bash
# Применяет миграции 049–059 (ремедиация аудита + перестройка маркетплейса) к целевой БД.
# Запускает ВЛАДЕЛЕЦ (у агента нет прод/staging-кредов, секреты он не читает).
#
# Использование:
#   PGURL='postgresql://postgres:<pass>@db.<ref>.supabase.co:5432/postgres' \
#     bash scripts/apply-pending-migrations.sh
#
# STAGING ref: mlgyuonypcyseryrmcms   |   PROD ref: wtevirwkshidxskqpvtu
# Строку подключения брать в Supabase Dashboard → Project Settings → Database.
#
# ВАЖНО:
#  - Перед накатом на ПРОД сделать бэкап (необратимо).
#  - fx-cron (025) хардкодит staging-ref; это НЕ в диапазоне ниже, но при настройке
#    крона на прод заменить url/anon на прод (см. docs/PROD_MIGRATION_PLAN_049-059.md).
#  - Миграции идемпотентны (if not exists / drop policy if exists), повторный прогон безопасен.
set -euo pipefail

if [[ -z "${PGURL:-}" ]]; then
  echo "ERROR: задай PGURL (строка подключения к целевой БД)." >&2
  exit 2
fi

cd "$(dirname "$0")/.."

MIGRATIONS=(
  049_audit_hardening_batch1
  050_consent_write_enforcement
  051_account_deletion_fk
  052_release_after_refund_guard
  053_money_accounting_fixes
  054_user_blocks
  055_deal_updates
  056_merchant_role
  057_gift_orders
  058_recipient_has_address
  059_gift_notifications
)

for n in "${MIGRATIONS[@]}"; do
  f="supabase/migrations/${n}.sql"
  [[ -f "$f" ]] || { echo "MISSING $f" >&2; exit 1; }
  echo "== applying $n =="
  # -1: каждый файл в своей транзакции; ON_ERROR_STOP: падаем на первой ошибке в файле.
  psql "$PGURL" -v ON_ERROR_STOP=1 -1 -f "$f" || { echo "FAILED at $n" >&2; exit 1; }
done

echo "ALL MIGRATIONS APPLIED (049–059)."
