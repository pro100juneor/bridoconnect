-- 040: уборка осиротевших полей настроек (14.09.2026).
--
-- two_factor: 2FA теперь реализована через Supabase Auth TOTP MFA, состояние
-- живёт в auth.mfa_factors. Колонка в user_preferences осталась от тумблера,
-- который ничего не включал — храня её, мы храним ложное состояние.
--
-- push_notifications: доставки push нет (ни APNs, ни web-push), тумблер убран
-- из UI как фикция. Колонку не удаляем: она вернётся вместе с реальной
-- доставкой, а данные о согласии пользователя терять не хочется.

alter table public.user_preferences drop column if exists two_factor;
