-- 032: KYC через Stripe Identity (docs/SECURE_KYC_STORAGE.md, рівні 1–2).
-- Сирі документи ми не зберігаємо: у profiles лише id сесії та вердикт.

alter table profiles
  add column if not exists identity_verification_id text,
  add column if not exists verified_at timestamptz;
