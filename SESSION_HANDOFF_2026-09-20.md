# BridoConnect — HANDOFF / состояние сессии (2026-09-20)

**Мастер-файл на случай падения сессии.** Здесь всё, чтобы возобновить работу с нуля.
Ветка: **`feat/appstore-launch`** (от `346f6c3`), **38 коммитов**, **НЕ запушена**, **НЕ задеплоена**.

---

## 0. Быстрый статус

- **iOS-приложение установлено и запущено на обоих телефонах** (iPhone 15 Pro Max + iPhone 17 Pro Max). См. раздел 4.
- Веб собирается/работает; `typecheck + lint + build + test` — зелёные; 21 юнит-тест.
- Не-платёжные флоу проверены вживую против локальной БД (см. раздел 5).
- Платежи **отложены** (нужны юрист + провайдерские sandbox-ключи).
- Прод НЕ трогали: миграции 042–047 только локально + в ветке.
- Есть незакоммиченный файл `docs/LEGAL_QUESTIONS_2026-09-20.md` (проверить/удалить при желании).

## 1. Все документы сессии (в корне репо)

- `AUDIT_INDEPENDENT_2026-09-20.md` — независимый аудит (находки C-1..H-14).
- `PLAN_APPSTORE_LAUNCH_2026-09-20.md` — полный план релиза в App Store (фазы 0–9).
- `PLAN_TO_DEMO_2026-09-20.md` — план до демо-версии.
- `APPSTORE_READINESS_2026-09-20.md` — сводный статус готовности + решения.
- `LEGAL_QUESTIONS_FOR_COUNSEL_2026-09-20.md` — детальный опросник для юриста.
- `LEGAL_COMPLIANCE_ACTIONS_2026-09-20.md` — план по юр-заключению (юр→техника, RED/MUST/AFTER).
- `SESSION_HANDOFF_2026-09-20.md` — этот файл.

## 2. Полный лог коммитов сессии (oldest→newest)

```
d1b85d8 fix(honesty): убрать ложное «GmbH», выдуманную статистику и дубль USt-IdNr
2232676 fix(app): вечный LIVE-бейдж на записи и залипание кнопки оплаты (Adyen)
d883fac fix(honesty): не праздновать оплату Premium заранее и убрать фейковый курс в Wallet
4c8a32a fix(app): рабочий pull-to-refresh в Wishlist и поиск по name+city+bio с фильтром
1318916 fix(app): реальная проверка устройств в StartStream и живой счётчик непрочитанных Feed
9917041 feat(shop): персистентные лайки товаров (product_favorites)                [миграция 042]
349d00a feat(chat): прямой DM без сделки (direct_threads/direct_messages)         [миграция 043]
a6b6348 feat(moderation): жалоба на пользователя из чата (reports) — Apple 1.2    [миграция 044]
b08bccd feat(chat): вложения (фото/файлы) в deal-чате и DM                        [миграция 045]
22eeb92 feat(auth): обязательное принятие Условий и Политики при регистрации
43ba22d feat(paypal): доделать capture и реальный release escrow (Фаза 4, gated OFF)
a57bb3e docs(release-escrow): обновить устаревший комментарий про PayPal-релиз
2a13156 fix(security): устранить IDOR и утечку ошибок в PayPal capture/release
bb4e403 fix(security): allowlist типов вложений и download для не-картинок (Stored XSS)
5aa2a1f feat(wise): фандинг трансфера + rollback claim (C-3, gated by config/sandbox)
e3aa75a fix(dlocal): починить проверку подписи вебхука (H-3)
e102442 test(money): первые юнит-тесты — конвертация валют и форматирование (H-14)
5813f6c ci: сделать тест-гейт настоящим (npm test)
9aa6d37 test(storefront): инварианты getTheme — 200 уникальных тем
b554f93 fix(reviews): заполнять reviews.role и убрать мёртвую запись рейтинга (H-9)
2f0e7f1 fix(ux): alert() → тосты и честная копия Google-логина
5dbb934 fix(webhooks): не терять платежи Adyen + константное сравнение подписей + CRON fail-closed
48425bc feat(dispute): реальная загрузка доказательств вместо фейковой зоны (H-8) [миграция 046]
aecaea7 fix(rls): BEFORE INSERT-гард на deals — фейковый raised/статус (H-11)      [миграция 047]
b646680 chore: удалить мёртвую функцию categoryEmoji в Feed
4be87ff chore: удалить сироты-хуки useStreams/useLiveKit/usePremium и пустую seo/
699ad7e fix(compliance): sanctions-screen fail-closed (H-1)
0d2ba4b feat(ios): фандрайзинг-донаты уводятся в Safari (App Store 3.2.2(iv))
c313ec3 fix(toast): подписка на изменения один раз
21791c8 docs: сводный статус готовности к App Store
7a38b9d docs: детальный перечень вопросов к юристу
e0e7f2d refactor(types): убрать коллизию имён VerificationStatus
2ed27ef chore(admin): обернуть все строки Admin в t() — локализация
6311528 docs: план приведения в соответствие с юр-заключением
fc0ebbe fix(legal): убрать публичную терминологию «escrow/заморожено» (R3)
f488f70 fix(legal): убрать закрытую EU-ODR-ссылку + честный MiCA-коммент для крипто
c2043e6 fix(legal): Wallet — «Доступний баланс» → «Підсумок операцій» (R4)
4898924 feat(auth): подтверждение 18+ при регистрации + локализация строки согласия
```

## 3. Новые миграции (только локально + в ветке; НА ПРОДЕ НЕТ)

`042_product_favorites`, `043_direct_messages`, `044_reports`, `045_chat_attachments`,
`046_dispute_attachments`, `047_deals_insert_guard`.

> Новые фичи (лайки товаров, DM, жалобы, вложения, dispute-загрузка, deals-guard) заработают
> на устройстве/проде только ПОСЛЕ применения этих миграций к прод-Supabase.

## 4. iOS-установка — СДЕЛАНО (как воспроизвести)

- **Устройства (paired, зарегистрированы):** iPhone 15 Pro Max `iPhone16,2` id `19F9CA69-764D-5A51-9DC8-5457C9270EBA`; iPhone 17 Pro Max `iPhone18,2` id `31B87EC7-65B0-5A40-BF36-409D0D77A030`.
- **Подпись:** Automatic, team `XHR4JQAKJM` (Apple Development: Oleksii Kusov). Bundle `de.brido.connect`.
- **Xcode 26.6, Capacitor 8 (SPM, не CocoaPods).** Собираем `ios/App/App.xcodeproj` схему `App`.
- **Команды (пайплайн):**

```bash
npm run build
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates \
  -derivedDataPath /tmp/bc-ios-dd build
APP=/tmp/bc-ios-dd/Build/Products/Debug-iphoneos/App.app
xcrun devicectl device install app --device <DEVICE_ID> "$APP"
xcrun devicectl device process launch --device <DEVICE_ID> de.brido.connect
```

- **Важно:** сборка использует ПРОД backend (обычный `npm run build` берёт prod Supabase из env).
  Development-подпись, не TestFlight. Телефон должен быть подключён, разблокирован, Developer Mode ON, «Trust».

## 5. Живая проверка (локальная БД) — что подтверждено рабочим

Логин, поиск (name+city+bio), DM (создание треда через RPC + отправка + persist после reload),
лайк товара (persist, переживает reload), жалоба (reports-строка), магазин, уведомления, профиль,
форма создания запроса, список эфиров, настройки — всё без ошибок консоли.
**Не проверено (нужны внешние ключи):** живое видео LiveKit, KYC (Stripe Identity), чекаут (Stripe).

## 6. Локальная тест-среда (поднята в сессии)

- Локальный Supabase: `npx supabase start` (URL `http://127.0.0.1:54321`).
- Env для локального прогона: файл `.env.localdb.local` (gitignored) с локальным URL+ключом.
- Dev против локальной БД: `npx vite --mode localdb --port 5174` → `http://localhost:5174`.
- Тестовые юзеры (только в локальной БД): `test1@brido.local` / `test2@brido.local`, пароль `Password123!`.
- Проверка БД: `docker exec -i $(docker ps --format '{{.Names}}'|grep supabase_db) psql -U postgres -d postgres -c "..."`.

## 7. Ключевые решения

- **Apple:** in-app фандрайзинг с 5% комиссией запрещён (3.2.2(iv)) → **донаты вынесены в Safari** (native). Premium на iOS загейчен. Магазин физ-товаров остаётся (3.1.3(e)).
- **Терминология:** публично больше не «escrow/Treuhand/заморожено» → «захист платежу / резервування на карті» (ZAG/UWG, R3).
- **Платёжная архитектура (R1, главный RED-блокер):** deal-путь сейчас Separate Charges & Transfers + баланс платформы → юрист требует **destination charge напрямую получателю + manual capture**. НЕ сделано — нужен **Stripe test-ключ** для реализации+проверки.
- Юр-заключение целиком разобрано в `LEGAL_COMPLIANCE_ACTIONS_2026-09-20.md`.

## 8. Что осталось (по приоритету)

**RED (блокирует реальные деньги):** R1 (Stripe destination charge+manual capture — нужен Stripe test-ключ); юр-заключение по лицензированию/AML/санкциям; провайдерские sandbox-ключи.
**Не-платёжное (код):** DSA Art.30 (данные продавца), Widerrufsrecht (нужен юр-текст), R10 (видимость мед.данных), sanctions-перед-payout (R7), useChats N+1, profiles_select.
**Релиз:** GmbH/gGmbH (юрист), AGB-пакет, DPIA, App Store-ассеты, деплой ветки + прод-миграции, TestFlight/submit.
**Только владелец:** push/merge ветки, прод-миграции, реальные ключи — по явному «да».

## 9. Как возобновить

```bash
cd /Users/Alexey/bridoconnect
git checkout feat/appstore-launch
npm ci
npm run typecheck && npm run lint && npm run build && npm test   # всё зелёное
# локальная БД: npx supabase start && npx supabase migration up --local
# iOS: см. раздел 4
```

Прод-миграции и push — ТОЛЬКО по явному «да» владельца.

---

## 10. Соц-логин Apple/Google (2026-09-21) — КОД ГОТОВ, нужна настройка провайдеров

**Сделано в коде (ветка `feat/appstore-launch`, НЕ закоммичено):**

- `@capgo/capacitor-social-login@8.5.10` установлен, `npx cap sync ios` выполнен (SPM).
- `src/lib/socialAuth.ts` — новый модуль: iOS нативно (`signInWithIdToken` через `id_token`
  из системной шторки, nonce для Apple), web через `signInWithOAuth`. `initSocialLogin()`
  вызывается в `App.tsx`.
- Кнопки **Apple + Google** на `/auth` и `/register`, на **обеих** платформах (убран старый
  гейт `!isNative`). Apple обязателен рядом с Google по App Store 4.8.
- Экран-догмолка **`/welcome`** (`src/pages/Welcome.tsx`): новый соц-пользователь выбирает роль
  (спонсор/получатель) и принимает 18+/Условия. `ProtectedRoute` уводит на `/welcome`, пока
  `profiles.onboarding_completed_at IS NULL`. `AuthContext` отдаёт `needsOnboarding`.
- Миграция **`048_social_login_onboarding.sql`**: колонки `onboarding_completed_at`,
  `age_confirmed`, `terms_accepted_at`; бэкфилл существующих (не выкинет на гейт); апдейт
  `handle_new_user` (email-регистрация помечает онбординг завершённым через метаданные);
  RPC `complete_social_onboarding` (SECURITY DEFINER — т.к. `role` защищён 037).
- i18n: uk/en/de (`*.auth.json`) — кнопки Apple, экран welcome, ошибки.
- `.env.example`: `VITE_GOOGLE_IOS_CLIENT_ID`, `VITE_GOOGLE_WEB_CLIENT_ID`.

**Проверено:** `typecheck + lint + build + test` (21) зелёные. Миграция 048 применена к
**локальной** БД; триггер (соц→гейт, email→завершён) и все гварды RPC (роль/согласие/анон)
протестированы в транзакции с откатом.

**НЕ сделано (только владелец — см. `docs/SOCIAL_LOGIN_SETUP.md`):**

- Apple Developer: Sign in with Apple на App ID + Services ID + ключ `.p8`.
- Google Cloud: iOS + Web OAuth client'ы.
- Supabase Dashboard: включить провайдеров Apple/Google; для нативного входа добавить в
  «Authorized Client IDs» **iOS client id** (Google) и **bundle id `de.brido.connect`** (Apple).
- Xcode: capability «Sign in with Apple» + URL-scheme reversed-client-id Google.
- Заполнить env; применить миграцию 048 к **прод**-Supabase (по явному «да»).

Без этих шагов кнопки видны, но вход вернёт «Вход недоступен» — это ожидаемо.
