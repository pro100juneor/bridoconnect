# BridoConnect — отчёт для внешнего аудитора (единый документ)

**Дата:** 2026-11-08 · **Ветка:** `feat/appstore-launch` · **Назначение:** единая точка входа для
внешнего аудита всего проекта. Документ самодостаточен: описывает продукт, архитектуру, как собрать и
проверить, карту репозитория, модель безопасности, результаты внутреннего аудита и честный техдолг.
Сопровождает архив исходников `bridoconnect-audit-2026-11-07.tar.gz`
(sha256 `b59ad0d43c1c5b2f05f6d9d021ac5008efd15f4d9d7f35cde3c2935512088f36`).

> ⚠️ **Важный контекст:** платежи Stripe — в **тестовом режиме**, реальные деньги не ходят.
> На staging/prod присутствуют демо-данные. Полный честный список ограничений — раздел 10 и `KNOWN_ISSUES.md`.

---

## 1. Что это за продукт

P2P-платформа гуманитарной помощи (GmbH, DE). Спонсоры напрямую финансируют запросы получателей
(деньги/товары/задачи/лекарства/жильё) через эскроу-сделки; плюс **мерчант-маркетплейс** подарков,
прямые эфиры и платное продвижение профилей.

**Роли:** `sponsor` (финансирует), `recipient` (создаёт запросы, получает помощь и подарки),
`merchant` (ведёт магазин, исполняет заказы), `admin` (модерация, одобрение мерчантов).

**Ключевые потоки:**

- **Эскроу-помощь:** получатель создаёт запрос → спонсор финансирует (Stripe, separate charges &
  transfers, 5% комиссия платформы) → средства в эскроу → релиз получателю / возврат.
- **Подарок (маркетплейс):** спонсор покупает товар у мерчанта → отправляет конкретному получателю →
  **адрес получателя виден только мерчанту оплаченного заказа, спонсор его не видит** (критический
  инвариант приватности) → мерчант отправляет (трек) → статусы доставки.
- **Онбординг мерчанта:** заявка (`merchant_applications`) → одобрение админом → роль `merchant` +
  Stripe Connect.

---

## 2. Стек

| Слой             | Технологии                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Frontend         | React 18 + TypeScript + Vite 5, React Router 6, TanStack Query                            |
| UI               | Tailwind CSS, shadcn/ui (Radix), framer-motion, lucide-react                              |
| iOS              | Capacitor 8 (`@capacitor/ios`), Xcode-проект в `ios/App`, bundle `de.brido.connect`       |
| Auth             | Supabase Auth (email+пароль, TOTP MFA; соц-вход скрыт на iOS)                             |
| БД               | Supabase PostgreSQL + RLS — **60 миграций** (001–060)                                     |
| Realtime/Storage | Supabase Realtime (чаты), Supabase Storage (приватные бакеты)                             |
| Backend-логика   | Supabase Edge Functions (Deno) — **25 функций**                                           |
| Платежи          | Stripe Checkout + Connect (destination/transfer) + Billing (Premium) — **тестовый режим** |
| Прочие рейлы     | PayPal / Adyen / Wise / dLocal / BTCPay — код есть, **не активированы** в UI              |
| KYC / Live       | Stripe Identity (hosted) / LiveKit (WebRTC)                                               |
| Observability    | Sentry + PostHog (ключи на проде не заданы)                                               |
| Тесты            | Playwright (e2e), Vitest (28 юнит-тестов — денежный слой/утилиты)                         |
| Deploy           | Vercel (из `main`); альтернативно Docker + Caddy/nginx                                    |

Объём: 54 страницы, 56 роутов, 29 хуков, 42 компонента, 25 edge-функций, 60 миграций, 42 i18n-словаря
(uk/en/de), ~24k строк в `src/`.

---

## 3. Как собрать и проверить (воспроизводимо)

```bash
# 1. Зависимости
npm ci

# 2. Переменные окружения (клиент; серверные секреты — не в репозитории)
cp .env.example .env.local
#   минимум: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (anon)
#   (это ПУБЛИЧНЫЕ client-переменные, попадают в бандл SPA)

# 3. Статическая проверка и сборка
npm run typecheck     # tsc --noEmit (strict) → 0 ошибок
npm run lint          # eslint --max-warnings=0 → 0
npm test              # vitest → 28/28
npm run build         # vite build → dist/

# 4. Dev-сервер
npm run dev

# 5. e2e (рассчитан на staging-бэкенд)
npm run test:e2e

# 6. iOS (нужен macOS + Xcode)
npm run build && npx cap sync ios
#   открыть ios/App в Xcode или собрать через xcodebuild
```

CI (`.github/workflows/ci.yml`) гейтит `typecheck` перед `build`, прогоняет тесты и `npm audit`.
**Состояние на момент отчёта:** конвейер зелёный (tsc 0 · eslint 0 · тесты 28/28 · build ок).

**Для запуска БД локально** нужен Supabase CLI (`npx supabase start`); миграции — `supabase/migrations/`.
Edge-функции (Deno) локально в CLI-стеке не сервятся — проверяются на staging/sandbox (см. гейты).

---

## 4. Карта репозитория

```
src/
  pages/            54 экрана (public/ — лендинг и /u/:slug; app/ — за авторизацией; Auth/Register/Welcome)
  components/       42 компонента (ui/ — shadcn-примитивы; layout/AppLayout — ролевая таб-навигация)
  hooks/            29 хуков (data-слой: Supabase-запросы, платежи, realtime)
  contexts/         AuthContext (сессия, роль, онбординг, MFA)
  integrations/supabase/  client.ts, types.ts (TS-типы доменной модели)
  i18n/             useT + 42 словаря <locale>.<ns>.json (uk/en/de), объединяются глобом
  lib/              утилиты (money, native/Capacitor, socialAuth, chatAttachments…)
  storefront/       публичная брендированная витрина /store/:slug
supabase/
  migrations/       60 .sql (схема + RLS + SECURITY DEFINER RPC); порядок = префикс NNN
  functions/        25 edge-функций (Deno): create-checkout, stripe-webhook, release-escrow,
                    refund-deal, connect-*, webhook-*, send-email, kyc-trigger, …; _shared/ — общий код
ios/App/            нативный Capacitor-проект (Info.plist, pbxproj, Package.swift)
public/             ассеты (иконки PWA, изображения, видео/озвучка лендинга), manifest.json, sitemap.xml
tests/e2e/          Playwright
docs/               спеки (в т.ч. REBUILD_MARKETPLACE_SPEC — перестройка в маркетплейс)
*.md (корень)       README, KNOWN_ISSUES, PROJECT_HANDOVER, AUDIT_*, SESSION_HANDOFF, DESIGN, …
```

Рекомендуемый порядок чтения для аудитора: этот документ → `KNOWN_ISSUES.md` → `AUDIT_DEEP_2026-10-01.md`
(RLS-матрица, money-edge спек) → `AUDIT_FULL_2026-11-07.md` (последний полный аудит) → миграции → edge.

---

## 5. Модель данных и RLS (безопасность на уровне БД)

Схема в `supabase/migrations/`. Основные таблицы: `profiles` (role), `deals` (эскроу-запросы),
`products`/`shop_profiles` (магазины мерчантов), `orders` (+gift: `beneficiary_id`, `shipping_address_id`,
`is_gift`, `fulfillment_status`, `tracking`), `shipping_addresses`, `merchant_applications`, `reviews`,
`disputes`, `streams`, `notifications`, `user_blocks`, `deal_updates`, `promotions`, `transactions`.

**Проверенные инварианты (внутренний аудит, раздел 9):**

- **RLS включён на всех 41 public-таблицах.** `sanctions_screening_log`, `edge_rate_limits` — только service_role.
- **Приватность адреса подарка.** `shipping_addresses` — RLS только для владельца (recipient). Спонсор/
  покупатель таблицу не читает. Мерчант получает адрес только через SECURITY DEFINER RPC
  `order_shipping_for_merchant` при `seller_id=auth.uid()` и статусе заказа `paid/shipped/completed`.
  Покупателю виден лишь UUID адреса (мёртвый FK), не строки.
- **Ролевая целостность.** `profiles.role` защищён BEFORE UPDATE-триггером (raise кроме service_role/admin);
  клиент не может самоэскалироваться в `merchant`/`admin`; merchant — только через
  `decide_merchant_application` (admin-gated), admin — вручную.
- **Денежные колонки** (deals.raised/amount/status/escrow, streams.raised/goal, orders/transactions)
  защищены от клиентской записи; все `apply_*/release_escrow/increment_*` RPC отозваны у anon/authenticated
  и несут status/idempotency-гварды.
- **SECURITY DEFINER-функции** после 049 явно задают `set search_path=public`; 049 ретро-фитит более ранние.
- **Профили публично читаемы** (`profiles_select using(true)`) — осознанное решение для маркетплейса;
  платёжные идентификаторы/крипто-адреса/анкета спонсора вынесены в закрытые таблицы с RLS (миграции 035/038).

---

## 6. Edge-функции и платёжные рейлы

25 Deno-функций в `supabase/functions/`. **Активен только Stripe (тестовый режим).** PayPal/Adyen/Wise/
dLocal/BTCPay — код написан, в UI не активированы.

Проверено корректным (внутренний аудит): JWT-валидация в каждой функции; подписи вебхуков
Stripe/PayPal/Adyen/dLocal/BTCPay — fail-closed; idempotency Stripe (dedup по `event.id` до денежных RPC,
`idempotencyKey` на release/refund, reservation-TTL стока); fee/split 5% консистентен; gift-поток не
раскрывает адрес спонсору (сервер резолвит адрес сам, в metadata — только `id`).

**Открытые пункты по edge — под гейт D-003** (Deno не выполняется/не деплоится на машине аудита-подготовки,
нужен Stripe-sandbox для верификации): см. раздел 9.3.

---

## 7. Модель секретов

- В `src/` **нет хардкод-секретов** (0 совпадений `sk_`/`AIza`/`service_role`/`PRIVATE KEY`). Клиент читает
  только `VITE_*` (публичные) + Supabase publishable (anon) ключ.
- `.gitignore` корректен: `.env*` игнорируются (кроме `.env.example` с плейсхолдерами). Серверные секреты
  (Stripe secret, service_role, LiveKit, Resend, провайдеры) — в окружении Supabase/Vercel, **не в репозитории**.
- **git-история:** единственный когда-либо закоммиченный `.env.production` во всех версиях содержал только
  `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` (публичные, и так в бандле). Серверных секретов в
  истории не было → ротация не требуется.
- **Архив аудита** собран `git archive HEAD` — содержит только отслеживаемые файлы, без `node_modules`/`dist`/
  `.env`-секретов.

---

## 8. iOS / Capacitor

Info.plist: **portrait-lock**, все 4 privacy-строки (Camera/Mic/PhotoLibrary/PhotoLibraryAdd, укр.),
`ITSAppUsesNonExemptEncryption=false`, ATS по умолчанию (без оверрайда). Bundle `de.brido.connect`,
версия 1.0 (build 1). Соц-вход скрыт на iOS (App Store guideline 4.8), Premium скрыт на iOS (3.1.1 —
внешние платежи). CORS edge-функций допускает нативный origin `capacitor://localhost`.

---

## 9. Внутренний аудит (2026-11-07) — метод, исправленное, открытое

**Метод:** сквозной аудит всего приложения по 6 доменам (страницы/роутинг, хуки/data, компоненты, edge,
миграции/RLS, i18n/конфиг/iOS), независимая верификация каждой находки, исправление реальных дефектов
порциями с зелёным конвейером; ключевое проверено на iOS-симуляторе и в браузере против staging.

### 9.1 Исправлено и проверено (коммиты в ветке)

| Severity | Область              | Дефект → фикс                                                                                                                                                                           | Коммит    |
| -------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| HIGH     | DealUpdates          | PDF-чек рендерился как битый `<img>`, не открыть → ветвление image/ссылка                                                                                                               | `a12fc69` |
| MED      | ChatAttachment       | вечный скелетон при ошибке подписи URL → состояние error+фолбэк                                                                                                                         | `a12fc69` |
| LOW      | CookieConsent        | согласие analytics/tracking по умолчанию вкл. (GDPR) → opt-in `false`                                                                                                                   | `a12fc69` |
| LOW      | ReviewModal          | нет закрытия по Escape → добавлено                                                                                                                                                      | `a12fc69` |
| HIGH     | Публичная `/u/:slug` | CTA вели гостя в тупик `/auth` без возврата → `ProtectedRoute` `from` + возврат после входа                                                                                             | `4740d09` |
| MED      | Notifications        | gift/message/review-строки без `deal_id` — тап «мёртвый» → маршрутизация по типу                                                                                                        | `4740d09` |
| MED      | Search               | краш (TypeError) на профиле без имени → `(name \|\| "?")`                                                                                                                               | `4740d09` |
| MED      | useProfile           | чужой профиль после смены аккаунта → очистка+alive-guard                                                                                                                                | `db30a56` |
| MED      | useTransactions      | баланс по `limit(50)` вместо всего леджера → по полному леджеру                                                                                                                         | `db30a56` |
| MED      | useChats             | превью чатов прежнего юзера после переключения → per-run guard                                                                                                                          | `db30a56` |
| LOW      | AuthContext          | `loadOnboarding` на каждый TOKEN_REFRESHED → ключ `user?.id`+guard                                                                                                                      | `db30a56` |
| LOW      | i18n                 | 2 ключа только-fallback → добавлены в uk/en/de                                                                                                                                          | `21b17fb` |
| HIGH     | PWA-манифест         | иконки 192/512 отсутствовали, PWA не ставилась → реальные PNG                                                                                                                           | `21b17fb` |
| HIGH     | RLS мигр. 060        | `merchant_update_fulfillment` без проверки статуса (self-complete / вскрытие адреса неоплаченного заказа) → предусловия paid→shipped→completed, delivered→completed только для подарков | `32c500c` |
| LOW      | RLS мигр. 060        | `reports` force `status='open'`; `search_path` на protect-функциях                                                                                                                      | `32c500c` |
| MED      | Вёрстка              | кнопки Купити/Оформити перекрыты навбаром → подняты над ним (проверено на симуляторе)                                                                                                   | `80eb0e0` |

Миграция 060 применена на **staging** (prod — гейт D-001).

### 9.2 Проверено и признано чистым

Приватность адреса подарка (SQL-инвариант держится), ролевая целостность (нет самоэскалации), RLS на всех
таблицах, защита денежных колонок, auth/подписи вебхуков edge, idempotency Stripe, i18n-паритет
(uk=en=de=1223 ключа, 0 расхождений), отсутствие секретов (в т.ч. в git-истории). Подробности — раздел 5–7
и `AUDIT_FULL_2026-11-07.md`.

### 9.3 Открытое — под гейты / владельцу (НЕ исправлялось; нельзя верифицировать на этой машине)

- **[HIGH / edge, D-003]** CORS: прод-домен (`bridoconnect.com`) отсутствует в `ALLOWED_ORIGINS` платёжных
  функций (кроме send-email) → запросы с прод-домена блокируются браузером. Fix: добавить домен(ы) в allowlist
  всех функций (централизовать в `_shared`), подтвердить канонический прод-домен, задеплоить.
- **[HIGH / edge, D-003]** Утечка сырых ошибок провайдеров клиенту (refund-deal, create-checkout, create-_,
  connect-_, kyc-trigger): возвращать generic-код, детали — в серверный лог (паттерн уже есть в connect-status).
- **[MED / edge, D-003]** `create-paypal-order` без гейтов `deal.status`/already-funded; dLocal без реального
  split/payout (деньги застревают на платформе); `webhook-btcpay` без edge-идемпотентности.
- **[LOW / edge]** англоязычные `message` в UI — локализовать по стабильному коду ошибки.
- **[LOW / продуктовое]** Profile: пункты меню (Моя публічна сторінка / Активні угоди / Обрані виконавці /
  Гаманець) показываются всем ролям — ролевой проход меню (решение владельца; не крашит).

Почему edge не правился: функции Deno не выполняются и не деплоятся в среде подготовки аудита; деплой —
отдельное действие владельца; верификация платёжного пути требует Stripe-sandbox (D-003). Класть
непроверенные правки платёжного кода в архив как «исправленное» было бы некорректно по отношению к аудитору.

---

## 10. Честный техдолг и ограничения (из `KNOWN_ISSUES.md`)

**Блокирует коммерческий запуск:**

1. **Stripe в тестовом режиме** — реальных платежей/KYC нет.
2. **Supabase Free-план** — нет авто-бэкапов/PITR; проект замораживается после ~7 дней неактивности.
3. **Демо-данные на проде** — тестовые аккаунты и товары видны; вычищаются перед запуском.

**Деградирует без ключей (код готов):** LiveKit (эфиры), Resend (email no-op), Sentry (DSN нет),
PayPal/Adyen/Wise/dLocal/BTCPay (не активированы; единственный рабочий рейл — Stripe).

**Архитектурные упрощения:** unit-тесты ранее отсутствовали (сейчас 28, денежный слой/утилиты); e2e
рассчитан на staging; `supabase/config.toml` отсутствует (дефолты CLI); счётчик непрочитанного — poll,
не realtime; Sign in with Apple в клиенте не реализован (на iOS соц-вход скрыт); MFA — клиентский гейт,
fail-open (на уровне БД aal2 не энфорсится — задокументировано).

Полный список — `KNOWN_ISSUES.md` в архиве.

---

## 11. Гейты (что НЕ выполнялось в этой подготовке)

- **D-001** — прод-миграции (042–060 на прод) и деплой ветки/edge: только по явному решению владельца.
- **D-003** — edge/Stripe-sandbox: верификация и деплой правок платёжного пути (раздел 9.3).
- **D-004** — юридический sign-off (возвраты/Widerruf, MiCA, DSA).

Внутренний аудит исправил всё верифицируемое на клиенте/в БД (staging); платёжный путь, прод-деплой и
юр-часть — за гейтами выше.

---

## 12. Как смотреть изменения

Ветка `feat/appstore-launch`. Аудит-коммиты — с префиксом `fix(audit):`/`docs(audit):` (см. таблицу 9.1).
История доступна при запросе отдельного архива с `.git` (в текущем архиве истории нет — только снимок HEAD).
Снимок HEAD зелёный по всему конвейеру.

---

_Конец отчёта. Контакт по вопросам аудита — через владельца проекта._
