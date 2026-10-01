# BridoConnect — глубокий аудит (максимальный проход), 2026-10-01

Подготовка к независимому аудиту партнёра. Метод: детерминированные гейты + **8 параллельных
дотошных ревьюеров**, каждый читал свой срез целиком и верифицировал находки против кода
(+ 2 добивочных прохода по непрочитанным файлам). Ничего не менялось — только чтение.
Первый (быстрый) проход — в `AUDIT_FULL_2026-09-30.md`; этот документ его расширяет и дополняет.

## Детерминированные гейты

`tsc` 0 ошибок (⚠ ослаблен `strict:false`, см. H-9) · `eslint` 0 · тесты 21/21 · `npm audit` 21 (1 crit/10 high — все dev/build-time).

## Покрытие

Прочитаны целиком: все 24 edge-функции, все 48 миграций (построена RLS-матрица), весь `src/pages/**`,
весь `src/hooks|lib|contexts|integrations|i18n`, публичные юр-страницы и юр-доки, dist-бандл.
Деньги прослежены end-to-end (client+edge+db) по всем рейлам. Добивка (`src/components/**`,
`src/storefront/**`, `scripts/**`, `tests/**`, натив iOS, конфиги) — отдельным проходом (в конце файла).

---

# 🔴 CRITICAL / BLOCKER

### CB-1. Деньги: refund/chargeback НЕ возвращает `raised`; release не блокируется прошлым возвратом (не-Stripe рейлы)

`stripe-webhook:442-449`, `refund-deal:299-306`, `webhook-paypal/dlocal/adyen`, `013_audit_fixes.sql:36`, `create-wise-payout:75-100`
Ни один refund-путь не уменьшает `deals.raised` (grep: `raised -` нет нигде — raised только растёт). `release_escrow` блокирует лишь `status in (cancelled,disputed,refunded)`; не-Stripe рейлы и **частичный** Stripe-refund (ставит status='active') не блокируют выплату; `create-wise-payout` не читает `refunded_at`. **Сценарий:** спонсор пополняет PayPal/dLocal/Adyen-сделку → escrow выплачен получателю → спонсор делает chargeback → webhook ставит только `refunded_at`, получатель оставляет деньги И получает возврат, `raised` навсегда завышен. Фикс: идемпотентно уменьшать `raised` и ставить status='refunded' во всех refund-хендлерах + guard `refunded_at is null` в release_escrow и wise-payout.

### CB-2. Согласие 18+/Условия/роль — не энфорсится сервером, а колонки согласия само-записываемы

`ProtectedRoute.tsx:55-58`, `AuthContext.tsx:55-66`, `048_social_login_onboarding.sql`, `protect_profiles_columns` (037:36)
Гейт `/welcome` — только в React; ни RLS/триггер/RPC не требует `onboarding_completed_at` перед записью данных. Соц-юзер с валидным JWT (роль `sponsor` по умолчанию) пишет через PostgREST без согласия. **Хуже:** колонки `onboarding_completed_at/age_confirmed/terms_accepted_at` НЕ в `protect_profiles_columns` → `PATCH /profiles {age_confirmed:true, onboarding_completed_at:now}` **фабрикует запись согласия и пропускает гейт вообще без RPC**. Усугублено fail-open (`AuthContext:61-65`). Фикс: серверный энфорс (RLS/триггер, требующий согласия перед записью, либо не выдавать рабочую роль до онбординга) + добавить 3 колонки в `protect_profiles_columns` + fail-closed.

### CB-3. Юр-BLOCKER: AGB §5 «платформа никогда не распоряжается средствами» ≠ код (платформа держит средства)

`AGBPage.tsx:30,40` vs `create-checkout:534-549` + `release-escrow:143-153`; R1 в `SESSION_HANDOFF`
Deal-путь Stripe = **separate charges & transfers**: charge капчится на баланс **платформы**, затем `transfers.create` получателю (shop/product/stream уже используют destination-charge, только deal — нет; manual capture нигде). AGB утверждает обратное. Триггеры: **ZAG/BaFin** (платёжная/e-money деятельность), **UWG** (текст ложен), внутренняя несогласованность §5↔§7. Фикс: реализовать R1 (destination charge + `capture_method:manual`, release=capture) ЛИБО переписать AGB/UI под реальность. **Не принимать реальные деньги до сведения.** (CODE + COUNSEL)

### CB-4. Юр-BLOCKER: «Treuhand-Frist» всё ещё в AGB §7 и в прод-бандле (R3 не завершён)

`AGBPage.tsx:40`, подтверждено в `dist/assets/index-*.js`
§2/§5 говорят «kein Treuhänder», §7 использует «Treuhand-Frist». Термин подразумевает регулируемый эскроу/траст, которого оператор не лицензирован вести. Фикс: заменить на формулировку резервирования/авторизации, пересобрать. (CODE)

---

# 🟠 HIGH

**Деньги/платежи**

- **H-1. `create-wise-payout` — гарантированная двойная выплата.** `create-wise-payout:75-100,175-186` не проверяет `payment_processor`; `escrow_released_at` можно выставить только через release-escrow, который для Stripe/PayPal/Adyen уже выплатил → повторный вызов платит второй раз с Wise-баланса. Функция задеплоена и вызываема любым авторизованным спонсором. Фикс: требовать `payment_processor='wise'` и отсутствие transfer/capture.
- **H-2. Adyen AUTHORISATION не увеличивает `raised`.** `webhook-adyen:101-121` вставляет ledger-строку ДО вызова `increment_raised_idempotent:116`, чей `exists()`-guard матчит эту же строку → инкремент не выполняется даже при первой доставке. Деньги двигаются, `raised=0`. Фикс: инкремент до вставки / гейт по 23505.
- **H-3. dLocal PAID не увеличивает `raised`.** `create-dlocal-payment:184` пре-сетит `dlocal_payment_id` при создании, а `apply_dlocal_payment` (016:68-72) использует его как маркер «уже применено» → инкремент никогда. Фикс: не сетить маркер при создании (как PayPal).
- **H-4. dLocal сумма кредитуется в `raised` без конвертации в EUR + нет max.** `apply_dlocal_payment` (016:72) добавляет локальную сумму (BRL/NGN/…) как EUR. 5000 NGN (~€3) → +5000. Фикс: конвертировать через `currency_rates` + cap.
- **H-5. `deals.amount_cents` рассинхронизируется с реально оплаченной сессией → release переводит неверный net (деньги застревают).** `create-checkout:605-616` пишет `amount_cents` только когда `stripe_session_id IS NULL` (первая сессия), release (release-escrow:136) переводит `amount_cents - fee`. €1 сессия (abandon) → потом €50 оплата → `raised=+50`, но `amount_cents=100` → получателю уходит ~€0.95, ~€49 застревают. Фикс: обновлять `amount_cents` из оплаченной сессии / брать сумму из charge.

**Безопасность/БД**

- **H-6. `reviews_insert` без проверки участия в сделке → накрутка/обвал рейтинга любому.** `002:31` (только `uid=reviewer_id`). Двумя фейками на любой `deal_id` → пейринг → `recalc_role_rating` пишет фейк в рейтинг жертвы. Фикс: проверять участие + корректного reviewee/role + завершённость сделки.
- **H-7. `delete-account` сломан для получателей + уничтожает финзаписи.** `deals.creator_id` CASCADE (001:23) + `transactions.deal_id` без правила → получатель, получивший донат, при удалении ловит FK-violation → HTTP 500, **удалиться не может никогда**; где cascade срабатывает — записи стираются, а не анонимизируются. Риск GDPR + App Store 5.1.1(v). Фикс: `creator_id`/`transactions.deal_id` → ON DELETE SET NULL.

**Клиент/корректность**

- **H-8. Валютный баг на публичных экранах.** `PublicProfile.tsx:259,263` и `HomePage.tsx:216,522,524` делят EUR-`raised` на `amount` в другой валюте и хардкодят «€». Не-EUR сделки показываются неверно (в т.ч. анонимам на лендинге). Фикс: `useCurrency().dealProgress`.
- **H-9. `tsconfig strict:false`** (`tsconfig.app.json:14`) — типобезопасность выключена по всему приложению; гейт typecheck слабый. Фикс: `strict:true` инкрементально.
- **H-10. Сброс пароля — тупик.** `ResetPassword.tsx` не имеет экрана «новый пароль»; `AuthContext.updatePassword` — ноль вызовов. По ссылке восстановления пароль сменить нельзя. Фикс: обработать recovery-сессию + форма нового пароля.
- **H-11. Баланс кошелька считается неверно.** `useTransactions.ts:18-33` — `limit(50)`, суммирует все статусы, смешивает валюты (нет колонки currency), неверные знаки (received показывается отрицательным). Фикс: серверный SUM по `status='completed'` и валюте.
- **H-12. `.env.production` в git и не в `.gitignore`** — сейчас только публичные ключи, но открыт путь для реального секрета. Фикс: gitignore + `git rm --cached`.
- **H-13. socialAuth Google-guard не проверяет web client id.** `socialAuth.ts:44-51,94` — при пустом `VITE_GOOGLE_WEB_CLIENT_ID` (=audience) `signInWithIdToken` падает. Фикс: требовать оба id.
- **H-14. Хуки глотают ошибки загрузки → ложные пустые состояния.** `useDeals/useTransactions/useFavorites/useChats/useReviews` не возвращают `error`; при сбое сети/RLS Feed/Wallet/Wishlist/ChatList показывают «нічого не знайдено» вместо ошибки+retry. Для кризисной аудитории критично. Фикс: пробрасывать `error`, ветка error+retry.

**Юр/комплаенс (нужен и counsel)**

- **H-15. MiCA:** крипта — кастоди через кошелёк платформы (`create-crypto-invoice`, BTCPAY_STORE_ID) → CASP-обязательства. Плюс адреса получателей собираются, но не используются.
- **H-16. Widerrufsrecht** для магазина отсутствует/мислейбл («Rückgaberecht» вместо статутного); §312g/§355 BGB.
- **H-17. DSA Art.30** — на карточках товара нет данных продавца (имя/адрес/статус trader).
- **H-18. Datenschutzerklärung существенно неполна** — не указаны PayPal/Wise/dLocal/Adyen/BTCPay/ComplyAdvantage/PostHog/Sentry/LiveKit/Resend; нет сроков хранения, трансграничной передачи (SCC), Art.22 (trust-score), Art.77.
- **H-19. FAQ обещает вывод баланса** (`FaqPage.tsx:49-51`, мин €10, 1-3 дня), которого нет; усиливает ZAG-позицию + UWG.

**Perf/a11y/DESIGN**

- **H-20. Бандл 753 КБ / 211 gzip**, лениво лишь 6 роутов; framer-motion в main; мёртвые deps (react-query/lottie-react/sonner). Фикс: lazy-роуты + manualChunks + удалить deps.
- **H-21. a11y:** `ReviewModal` без role=dialog/фокус-трапа/Escape; `Feed.tsx:362` карточка сделки — `div onClick` без клавиатуры (сделку не открыть с клавиатуры).
- **H-22. DESIGN:** `ui/dialog.tsx:19` `rounded-lg` (должно 2xl) — все модалки off-brand; спиннеры вместо скелетонов на загрузке роутов/авторизации.

---

# 🟡 MEDIUM

- `streams` UPDATE даёт хосту подделать `raised/status/goal_amount` (нет column-guard триггера) — `003:18`.
- Старые `SECURITY DEFINER`-функции без `set search_path` (handle*new_user, release_escrow, apply*\*, recalc_role_rating и др.); `recalc_role_rating` к тому же **публично исполняема** (проскочила revoke-sweep 036).
- MFA (aal2) — клиентский гейт, fail-open (`ProtectedRoute:35-41`).
- `dlocal_payee_id`, `identity_verification_id`, `verified_at` мир-читаемы через `profiles_select using(true)`.
- `create-checkout` допускает несколько платежей на сделку → порча escrow-учёта; `release-escrow` не проверяет, что charge реально прошёл, перед выплатой с баланса.
- Крипто InvoiceSettled не увеличивает `raised` (пре-сет маркер; рейл off); `transactions` без колонки `currency`; refund пишет две ledger-строки (двойной учёт).
- Подписка `priceId` управляется клиентом без серверного allowlist (`create-checkout:203-211`) → можно оплатить премиум по чужой/дешёвой цене.
- Alt-rail create-\* доверяют сумме из тела (кредит идёт из подписанного webhook, но нет сверки с суммой сделки); `create-paypal-order` без guard закрытой сделки.
- `transactions.user_id` CASCADE стирает финзаписи спонсора при удалении; `email_log."to"` хранит email после «стирания».
- Утечка сырых текстов ошибок провайдеров наружу (`refund-deal`, `create-checkout`, `release-escrow`, create-adyen/dlocal/crypto/paypal, connect-_, kyc-_).
- Вебхуки dlocal/btcpay при передоставке падают в 500 (23505 не обработан) → бесконечные ретраи; cron-secret сравнение не constant-time; LiveKit subscribe-токен не ограничен комнатой.
- `ActiveDeal.tsx:109` степпер показывает «подтверждено» для любой active-сделки; `CreateDeal` даёт опубликовать `amount=0`/пустое описание.
- Admin — клиентский гейт (бэкапится RLS для profiles/products/streams/promotions — подтверждено RLS-матрицей).
- **i18n: 60 ключей отсутствуют во всех словарях** → en/de видят украинский fallback; хуже всего **Admin (34)** + 2 сырые укр-строки; Transparency/Chat/StartStream/Dispute/HomePage. Нет CI-проверки i18n.
- `observability.ts` скраб PII неполон (тело запроса Sentry, breadcrumbs, `code=`/`api_key`).
- `useProfile` `.single()` + без alive-guard; `useReviews`/`useSponsorReveal`/`useChats` без alive-guard (гонки/перезапись); `useChats` N+1.
- deals INSERT не сбрасывает `amount_cents`/`platform_fee_cents` (047).
- Публичные тексты «кошти резервуються на карті/в системі» (`HomePage:660`, `HowItWorks:27`, `Faq:10`) не соответствуют флоу; FAQ выдумывает «команду»/«миттєве зарахування».
- Платное продвижение в ленте без метки «реклама» (P2B Art.5, UWG §5a) — `PromoteMe`/`Feed`.
- Оверстейтмент «200+ стран / 6 коридоров / всі через ліцензованих провайдерів» (жив только Stripe).
- Impressum ссылается на отменённые «§5 TMG»/«§55 RStV» (→ DDG/MStV).
- a11y: `index.html` `user-scalable=no` (WCAG 1.4.4); нет `aria-current` на активной вкладке; лейблы форм `StartStream` без `htmlFor`; `ChatAttachment` ссылка без имени; nav-landmarks без имён.
- DESIGN: эмодзи как иконки (Feed/HomePage/Dispute/Admin/…); motion без `prefers-reduced-motion` (StreamViewer/EditProfile — бесконечный пульс); таргеты <44px (`Feed:152,159`); нет top safe-area в `AppLayout`; `Card`/примитивы используют `rounded-xl`+`shadow-sm` вместо `rounded-2xl`+stacked; один top-level ErrorBoundary (падение страницы рушит всё приложение); `Wallet` без скелетона; нет виртуализации списков.

---

# ⚪ LOW (сводно)

Утечка ошибок (мелкие), аватар без cache-buster + `ext undefined` + глотание ошибки загрузки, `Search` без escape ilike-wildcards и без guard порядка ответов, `DealHistory` «Надано» смешивает дано/получено и цель/факт, `.single()` там где строки может не быть (PublicProfile/StreamViewer/Chat), `useDeals` оптимистичный desync, отправитель не видит своё сообщение до эха realtime, `usePreferences` может терять патч, `randomNonce` modulo-bias (ничтожно), premium не iOS-gated (Stripe в webview — риск 3.1.1), Adyen sponsor attribution теряется, Wise-retry может задвоить, product-order refund без buyer-ledger, FAQ «офіційна організація», Impressum/Support на gmail+vercel.app, Dockerfile без USER, `package.json` без engines, eslint `no-unused-vars` off, изображения без lazy/размеров, мемоизация редка.

---

# ✅ Проверено и НАДЁЖНО (заявить партнёру как пройденное)

- **Клиент не может завысить деньги:** `enforce_deals_insert_defaults` (047, INSERT), `protect_deals_columns`/`protect_profiles_columns` (037, UPDATE), все money-RPC revoked от anon/authenticated (036/039), `transactions` INSERT revoked от клиентов (008).
- **Идемпотентность Stripe:** UNIQUE(processor,event_id) + PI-маркер; двойного зачисления нет. Двойной release закрыт (idempotencyKey + `FOR UPDATE` в release_escrow).
- **Подписи всех вебхуков fail-closed** (Stripe/PayPal/Adyen/dLocal/BTCPay), проверка ДО зачисления.
- **Магазин:** сток race-safe (`reserve_stock where stock>0`), TTL-резерв + cron; суммы shop/promotion серверные; конвертация корректна.
- **Санкции** fail-closed (нельзя само-очиститься); **KYC-статус** не подделать (protect-триггер); эскалация до admin невозможна; SSRF нет; `service_role`-ключа в бандле нет; редиректы валидируются.
- **`public_platform_stats`** считает по `escrow-released, non-refunded` — публичная цифра НЕ раздута багом raised.
- **Соц-логин:** nonce Apple корректен, guard от краша Google корректен, RPC онбординга безопасен (валидация роли/идемпотентность/auth), бэкфилл безопасен, entitlement/URL-scheme корректны.
- **App Store:** донаты (deal+stream) вынесены в Safari (3.2.2(iv)); Sign in with Apple parity; удаление аккаунта присутствует (5.1.1(v) — но см. H-7 баг для получателей).
- **Честность контента:** выдуманных €/★/счётчиков в бандле НЕТ (история фейк-статистики вычищена); демо помечены «вигадані історії»; Impressum честный (GmbH убран, ODR убран).
- **Деньги-математика** (`money.ts`), `useCurrency.dealProgress`, i18n-движок, `chatAttachments` (allowlist типов), `native.ts` — верны.

---

# Добивка покрытия (компоненты, storefront, scripts, tests, натив, конфиги)

**HIGH**

- **GF-1. CI-гейт бессмысленен для денег/RLS/auth.** `ci.yml:45` гоняет `vitest run`, а `vitest.config.ts:11` включает лишь 2 файла (`money.test.ts`, `themes.test.ts`). Серверная денежная логика (release_escrow/confirm/resolve_dispute/fee-split) **не тестируется вообще**; e2e-спеки `donate-happy-path`/`release-escrow` **мокают бэкенд** (`page.route` → фейковый ответ) — проверяют навигацию, не корректность денег. `scripts/rls-regression.mjs` — хороший real-RLS-тест, но **не подключён к CI** (никогда не гоняется). Playwright (17 спеков) — только вручную. Итог: гейт мержа доказывает лишь «типы/линт/сборка + 2 чистые функции». Фикс: подключить `rls-regression.mjs` + денежные e2e (с реальными edge-функциями) в CI; добавить серверные тесты на fee/escrow RPC.

**MEDIUM**

- **GF-2. `scripts/seed-local.mjs`** — админ `oleksii@brido.local` с паролем `"Oleksii"`, прочие — `"password123"`; `SUPABASE_URL` env-переопределяем **без guard'а на локальность**, а на :116 деструктивный `deals.delete().in('creator_id',…)`. Запуск с URL на прод/стейдж + service-role → создание слабого админа + потеря данных. Фикс: жёстко отказывать, если URL не 127.0.0.1/localhost; не сеять админа с угадываемым паролем.
- **GF-3. `PageTransition` оборачивает всё дерево** (`App.tsx:75-83`) → каждая навигация ремоунтит всё приложение (мигание таб-бара, сброс скролла, ре-ран эффектов, **тихая очистка состояния ErrorBoundary**, двойной рендер). Фикс: анимировать только контент роута; ErrorBoundary/Suspense — снаружи.

**LOW**

- Storefront `Hero/Catalog` вставляют seller-URL в `<img src>` без allow-list/`referrerPolicy` → утечка IP/UA посетителя третьей стороне (не XSS). `deploy-hostinger.sh:48` шлёт весь env-файл на VPS (хватило бы публичных VITE\_\*). iOS `Info.plist` `UIRequiredDeviceCapabilities=armv7` (устаревшее для arm64/iOS15 — предупреждение валидации); landscape-ориентации при заявленном portrait-only. `VideoHero` `localStorage` без try/catch (приватный Safari → падение в ErrorBoundary). `ReviewModal`/`TwoFactorDialog` показывают сырой `error.message`. `CookieConsent` `role=dialog` на неблокирующем баннере + хардкод светлой темы. `PromoCarousel` точка не сбрасывает автопрокрутку; Space скроллит.

**✅ Добивка — чисто:** storefront без XSS (весь user-текст — JSX-children, экранируется; в CSS-переменные попадают только фикс-палитры); тема-движок (200 id, клемпинг) корректен; в scripts секретов нет (всё из env); iOS ATS безопасен (нет `NSAllowsArbitraryLoads`; cleartext только за `CAP_LIVE_RELOAD`), URL-scheme и entitlement корректны, подпись/бандл без секретов; `ui/*` примитивы стоковые; `.env.production` — только публичные значения.

## Итоговое покрытие

Прочитано целиком: **все 24 edge-функции, все 48 миграций, весь `src/` (pages/hooks/lib/contexts/integrations/i18n/components/ui/storefront), `scripts/`, `tests/`+CI, натив iOS (AppDelegate/Info.plist/entitlements/pbxproj), корневые конфиги, публичные юр-страницы, dist-бандл.** Не покрыто отдельным семантическим ревью (низкий риск / вне репо): `caddy/nginx/vercel.json` edge-CSP, App Store Connect data-labels (вне репо), рантайм/девайс-тестирование, живое поведение платёжных провайдеров (ключей нет). Механику ловят гейты (типы/линт/аудит зависимостей) — прогнаны.

---

# Статус исправлений (сессия 2026-10-01)

**✅ Исправлено и проверено (локальная БД / typecheck / build), закоммичено в `feat/appstore-launch`:**

- CB-2 — согласие на сервере: колонки согласия защищены (`protect_profiles_columns`) + `is_onboarded()`-гейт на создание deals/products/streams (миграции 049/050).
- CB-4 — «Treuhand» убран из AGB; Impressum — актуальные статьи (DDG/MStV).
- H-1 — `create-wise-payout` загейчен (только wise-сделка, без возврата).
- CB-1 (часть) — `release_escrow` блокирует выплату по сделке с возвратом (миграция 052).
- H-6/M-1 — `reviews` INSERT (участие+контрагент) и SELECT (не раскрывать нераскрытые).
- H-7 — удаление аккаунта: FK → ON DELETE SET NULL (миграция 051).
- H-8 — валюта на `PublicProfile`/`HomePage` через `dealProgress`.
- H-10 — рабочий сброс пароля (экран нового пароля).
- H-12 — `.env.production` из git; H-13 — Google-guard требует оба client id.
- streams column-guard; `recalc_role_rating` revoke; `search_path=public` на всех SECURITY DEFINER.
- H-22 (dialog rounded-2xl), a11y viewport (pinch-zoom), GF-2 (seed local-only + пароль admin).

**🔧 Money-edge — ТОЛЬКО owner + интеграционный тест (не менять вслепую в этой среде):**
Эти правки затрагивают платёжный стейт-машину edge-функций; провайдерского рантайма тут нет.

- **CB-1 (остаток):** в КАЖДОМ refund-хендлере (`stripe-webhook` charge.refunded, `refund-deal`, `webhook-paypal/dlocal/adyen`) идемпотентно уменьшать `deals.raised` и ставить `status='refunded'` (для частичного — пересчитывать). Сейчас refund ставит только `refunded_at` → `raised` завышен.
- **H-2 (Adyen):** в `webhook-adyen` вызывать `increment_raised_idempotent` ДО вставки ledger-строки (иначе `exists()`-guard видит свою же строку → `raised` не растёт).
- **H-3 (dLocal):** в `create-dlocal-payment` НЕ пресетить `deals.dlocal_payment_id` при создании (он маркер «применено» в `apply_dlocal_payment`) — как сделано у PayPal.
- **H-4 (dLocal):** `apply_dlocal_payment` конвертировать `p_amount` в EUR по `currency_rates` перед `raised +=` (сейчас локальная валюта кредитуется как EUR) + max-cap в `create-dlocal-payment`.
- **H-5 (Stripe):** обновлять `deals.amount_cents`/`platform_fee_cents` из реально оплаченной сессии в `apply_stripe_payment`/webhook (сейчас заморожено на первой сессии → release переводит неверный net).
- crypto — аналогично H-3 (рейл off); subscription `priceId` — серверный allowlist в `create-checkout`.

**⚖️ Требует юриста (counsel), не «фиксится» кодом вслепую:** CB-3 (R1: destination charge + manual capture, иначе платформа держит средства), H-15 (MiCA/крипто-кастоди), H-16 (Widerrufsbelehrung), H-17 (DSA Art.30), H-18 (Datenschutz — полная переработка). Код-часть (убрать крипто-кастоди/выровнять публичные тексты) — по решению владельца.

**⏳ Безопасно, но объёмно (не начато):** H-9 (`strict:true` — выжигалка), H-11 (баланс кошелька — серверный RPC), H-14 (хуки: прокинуть `error`+retry на страницы), i18n (60 ключей, Admin 34), остальные a11y/perf/DESIGN (H-20/H-21 частично, MEDIUM/LOW), GF-1 (подключить `rls-regression.mjs` + денежные e2e в CI).

> Все миграции 049–052 применены ТОЛЬКО к локальной БД. На прод — вместе с деплоем, по явному «да».

---

# Приоритет исправлений (перед реальными деньгами)

1. **CB-1** (refund не возвращает raised) + **H-2/H-3/H-4** (Adyen/dLocal raised-noop + FX) + **H-5** (amount_cents desync) — деньги считаются/двигаются неверно.
2. **H-1** (wise double-payout) — отключить/загейтить эндпоинт немедленно.
3. **CB-2** (серверный энфорс согласия + защита колонок) + **H-6** (reviews guard) + streams guard.
4. **CB-3/CB-4 + H-15..H-19** — юр (R1/Treuhand/MiCA/Widerruf/DSA/Datenschutz/FAQ) — с counsel, до приёма денег.
5. **H-7** (удаление аккаунта), **H-8** (валюта на публичных экранах), **H-10** (сброс пароля), **H-11/H-14** (баланс/ложные пустые состояния).
6. **H-9/H-12** (strict + env), **H-20..H-22** (бандл/a11y/DESIGN), затем MEDIUM/LOW.
