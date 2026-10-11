# BridoConnect — HANDOFF / мастер-состояние (2026-10-02)

**Мастер-файл на случай падения/clear сессии. Здесь всё, чтобы продолжить с нуля.**
Ветка: **`feat/appstore-launch`** (запушена). Платежи НЕ запущены. Прод НЕ трогали.

## 0. Текущая задача — АКТИВНО: перестройка в мерчант-маркетплейс

**ГЛАВНОЕ ДЛЯ НОВОГО АГЕНТА: сейчас идёт перестройка продукта по спеке
`docs/REBUILD_MARKETPLACE_SPEC_2026-10-11.md` (владелец её утвердил).** Прочти спеку и раздел §9 ниже.
Сделаны фазы **P0, P1, P2**; следующая — **P3** (магазины мерчантов как основная витрина), затем P4
(поток подарка: адреса/бенефициар/заказы/приватность) и P5 (выплаты/уведомления). Подробности и коммиты — в §9.

Директива владельца по стилю работы (действует постоянно): выполнять план до конца, без остановок и
лишних подтверждений; ошибки чинить сам; блокеры вести списком D-001…D-006 и продолжать остальное;
промежуточное не выдавать за готовое; **аудитору НЕ передавать до явной отмашки владельца «передавай»**.
Каждую порцию: батч → локальная проверка (tsc/eslint/test/build; миграции — на локальной БД) → коммит.
Коммит делаю сам; **push — только по команде владельца «запушити»** (сейчас 38 коммитов ждут push);
прод-миграции/деплой — только по явному «да» (D-001). Правила проекта — `CLAUDE.md`/`RULES_DETAILED.md`
(в т.ч.: UI-контракт — не менять вид без нужды/разрешения; не коммитить `.env*`; не вводить пароли/секреты).

Предыдущие большие вехи этой сессии (всё закоммичено): ремедиация по аудиту (§3), конкурентный ресёрч

- внедрение 7 фич (`COMPETITIVE_RESEARCH_2026-10-03.md`, §7), самоаудит 4 агентами + фиксы (§8),
  сборка и установка на iPhone 15 Pro Max (работает; signing настроен).

## 1. Документы аудита (в корне репо)

- `AUDIT_DEEP_2026-10-01.md` — **главный**: все находки (CB-1..CB-4, H-1..H-22, MEDIUM/LOW, GF-1/2),
  RLS-матрица, раздел «✅ надёжно», **раздел «Статус исправлений»** и **спек money-edge**.
- `AUDIT_FULL_2026-09-30.md` — первый (быстрый) проход.
- `SESSION_HANDOFF_2026-09-20.md` — предыдущий handoff (соц-логин Apple/Google).

## 2. Блокеры (физически требуют владельца/внешних — НЕ останавливают остальную работу)

- **D-001** — применение прод-миграций (049+) и деплой ветки: только по явному «да» владельца.
- **D-002** — настройка провайдеров Apple/Google/Supabase: кабинеты владельца (см. `docs/SOCIAL_LOGIN_SETUP.md`).
  Текущее: Supabase Apple=enabled, Google=disabled; Google Cloud iOS+Web client'ы созданы, Web redirect добавлен; `.env.production` содержит VITE*GOOGLE*\*; iOS entitlement/URL-scheme в коде.
- **D-003** — интеграционный тест платёжных рейлов на sandbox-ключах провайдеров (верификация money-edge правок).
- **D-004** — юр sign-off: CB-3 (R1/ZAG), H-15 (MiCA), H-16 (Widerruf), H-17 (DSA Art.30), H-18 (Datenschutz).
- **D-005** — App Store Connect (privacy data-labels, submit): владелец.
- **D-006** — резерв.

## 3. Сделано и закоммичено (ремедиация, ветка feat/appstore-launch) — ФИНАЛ

Конвейер зелёный: `typecheck` 0 · `eslint` 0 · тесты 21/21 · build ок · `npm audit` 21→6 (остаток — vite 5→8 мажор).
23 ремедиационных коммита поверх `957d79d`. Всё проверено (локальная БД / typecheck / build / test). Ключевое:

- **CB-2** согласие на сервере (защита колонок + `is_onboarded()`-гейт, миграции 049/050).
- **CB-1 (часть)** `release_escrow` блокирует выплату по возврату (052) + RPC `refund_deal_raised` (053).
- **CB-4** «Treuhand» убран из AGB; Impressum DDG/MStV.
- **H-1** wise-payout гейт; **H-2** Adyen raised-порядок; **H-3/H-4** dLocal маркер+FX (053 + edge);
  **H-5** create-checkout single-payment гейт; subscription priceId allowlist.
- **H-6/M-1** reviews (участие/контрагент, не раскрывать нераскрытые); streams column-guard; recalc revoke; search_path.
- **H-7** удаление аккаунта (FK SET NULL, 051); **H-8** валюта (PublicProfile/HomePage); **H-10** сброс пароля;
  **H-12** env из git; **H-13** Google-guard; **H-9** `strict:true` (0 ошибок).
- **H-14** ошибка+retry: Feed, Wishlist, ChatList (useDeals/useFavorites/useChats отдают error).
- **i18n**: +74 ключа (Admin 34 и др.) en/de больше не видят украинский; словари в парности.
- **a11y**: Feed deal-card клавиатура, aria-current/landmark/top-safe-area, StartStream labels, ChatAttachment alt, viewport pinch-zoom.
- **GF-1** CI audit-гейт + test:rls/test:e2e; **GF-2** seed local-only; **GF-3** PageTransition (ErrorBoundary/Suspense снаружи).
- deps: `npm audit fix` + удалены react-query/lottie-react/sonner.
- MEDIUM/LOW: CryptoCard (M-4), ActiveDeal stepper, CreateDeal валидация, observability PII-скраб, Search (wildcards+гонка),
  avatar cache-buster/ошибки, VideoHero storage, EditProfile reduced-motion/double-submit, useMessages guard+own-msg,
  Wallet hint, DealHistory «Надано», dialog rounded-2xl.

Миграции **049–053** — ТОЛЬКО локальная БД. На прод — D-001.

## 4. Осталось (НЕ закрыто — по категориям)

**🔧 D-003 — edge-tail (код-правка возможна, но нужен интеграционный тест провайдерами, не верифицируется здесь):**

- CB-1 остаток: подключить `refund_deal_raised` в refund-хендлеры (stripe-webhook/refund-deal/webhook-\*) идемпотентно —
  тонкая гонка (двухфазный claim refund-deal + webhook-settlement); нужен integration-тест, чтобы не задвоить списание.
- webhook-dlocal/btcpay: игнорировать 23505 при передоставке; error-message leakage — обернуть сырые ошибки провайдеров в generic.
  (edge-money H-2/H-3/H-4/H-5 код уже внесён — тоже под D-003 на верификацию.)
  **⚖️ D-004 — counsel:** CB-3 (R1/ZAG, платформа держит средства), H-15 (MiCA/крипто-кастоди), H-16 (Widerruf), H-17 (DSA Art.30), H-18 (Datenschutz). Код-часть (убрать крипто-кастоди/выровнять публичные тексты) — по решению владельца.
  **👤 Owner (текст/решение):** FAQ (вывод баланса/«команда»/«миттєве зарахування»), маркетинг «200+ стран/6 коридоров», Impressum/Support gmail+vercel.
  **🎨 Дизайнер (косметика, риск визуальной регрессии без ревью):** emoji→Lucide (Feed/HomePage/Dispute/Admin/…), базовые примитивы `Card`/`button`/`input` rounded-2xl+stacked-shadow, list virtualization, lazy-роуты (Admin/Premium/public/\*).
  **🧩 Требует модели данных:** H-11 баланс кошелька (нет колонки `transactions.currency`, зеркальные строки, двойной refund-леджер → серверный ledger-модель + RPC `wallet_summary`).
  **Мелкие остатки (LOW, по желанию):** useReviews/useSponsorReveal/useProfile alive-guard; subscribe-token gating (если стримы приватные); CookieConsent role; VideoHero language-picker a11y; PromoCarousel автопрокрутка/Space.

## 5. Как возобновить

```bash
cd /Users/Alexey/bridoconnect && git checkout feat/appstore-launch
npm ci
npm run typecheck && npm run lint && npm run build && npm test   # зелёное
# локальная БД для тестов миграций:
docker ps | grep supabase_db_bridoconnect   # должна быть up; иначе npx supabase start
# применить незакоммиченные/новые миграции локально:
docker exec -i supabase_db_bridoconnect psql -U postgres -d postgres < supabase/migrations/<N>.sql

# СБОРКА + УСТАНОВКА на iPhone (signing настроен, team XHR4JQAKJM, profile de.brido.connect):
npm run build && npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates build   # → BUILD SUCCEEDED
# UDID iPhone 15 Pro Max (CoreDevice): 19F9CA69-764D-5A51-9DC8-5457C9270EBA (проверить: xcrun devicectl list devices)
APP=$(ls -dt ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphoneos/App.app | head -1)
xcrun devicectl device install app --device 19F9CA69-764D-5A51-9DC8-5457C9270EBA "$APP"
# (устройство должно быть разблокировано и в сети; connection-reset — повторить install)
# iPhone 17 Pro Max сейчас unavailable — поставить, когда станет available.
# Миграции 049–056 — ТОЛЬКО локальная БД; на прод = D-001.
```

Правила проекта — `CLAUDE.md`/`RULES_DETAILED.md`. Коммит/push/прод-миграции — по правилам (прод — D-001).
Паттерн работы: батч → локальный тест/гейт → коммит; intermediate не выдавать за готовое.

## 6. Аудит-готовность (2026-10-03)

Конвейер прогнан заново и зелёный ПРЯМО СЕЙЧАС (не по памяти): `typecheck` 0 · `eslint` 0 ·
тесты 21/21 · `build` ок (3.2s). Паритет i18n чистый (en/de покрывают все uk-ключи). a11y back/icon
кнопки с `aria-label`. Денежный слой покрыт юнит-тестами (`money.test.ts`, 17 кейсов).

**Триаж `npm audit --omit=dev` — 7 (5 high, 2 moderate), все с обоснованием НЕ чинить вслепую:**

- **5 high** (`braces`/`chokidar`/`fast-glob`/`micromatch` ← `tailwindcss`): build/dev-инструменты,
  в клиентский бандл НЕ попадают; эксплуатируемость для скомпилированного SPA минимальна. Фикс =
  tailwindcss 4.x (semver-major, ломает стили → ВИЗУАЛ, только по «ok» владельца).
- **moderate `react-router` deserializeErrors() (SSR hydration)**: у нас Vite-SPA без SSR → **не применимо**.
- **moderate `react-router` open-redirect через backslash** (GHSA-wrjc-x8rr-h8h6): в коде **не достижимо** —
  все цели `navigate()` имеют фиксированный внутренний префикс (`/u/…`, `/app/…`), ни одна не начинается
  с `//` или `/\` (условие эксплойта). `window.location.href=url` — только доверенные checkout-URL от
  провайдеров. Фикс = react-router 7.x (semver-major, ломает роутинг) — реальным риском не оправдан.

**Конкурентный ресёрч:** `COMPETITIVE_RESEARCH_2026-10-03.md` (~50 приложений, приоритизированный
план с тегами SAFE-NOW / D-003 / VISUAL / OWNER / DATA-MODEL).

**Пачка-1 (visual, по «ok» владельца) — статус 2026-10-04:**

- ✅ **Block пользователя в DM** (`72532d6`) — `user_blocks` + RLS, реальная блокировка отправки
  (проверено на локальной БД). Миграция **054** — локально; прод = D-001.
- ✅ **escrow-баннер** в чате сделки (`fc8af23`) — анти-скам «мимо платформы».
- ✅ Report (чат+DM) — уже было. Trust-карточка (verified/rating/deals/reviews) — уже на PublicProfile.
  Empty states — уже на всех списочных экранах. Переделывать не стал (не пробел, риск регрессии).
- ⏳ Опционально: verified-бейдж в шапке чата (мелочь, низкий риск) — не делал, жду приоритет.

**Рамка владельца на внедрение:** «Всё, кроме визуала» — логику/доверие/платежи/надёжность/тексты/a11y
внедряю автономно; визуал/вёрстка/новые экраны — только по «ok» пачками. Деплой/прод — D-001.
**D-002 (вход через Supabase/GitHub-SSO) владелец паркует до вечера следующего дня — поправит сам за ноутбуком.**
Edge-функции (Stripe/PayPal/Adyen/dLocal/крипто) здесь не верифицируются (нет Deno) → money-path под D-003.

Остаток устранимого невизуального объёма на этой машине ЗАКРЫТ; дальнейшее — за гейтами (визуал=«ok»,
D-002=владелец завтра, D-003/D-004=внешние). **Аудитору НЕ передавать до явной отмашки владельца «передавай».**

## 7. Внедрено по плану ресёрча (2026-10-08) — директива «работать без остановок, пока есть план»

Пять фич, каждая проверена (tsc 0 · eslint 0 · тесты 28/28 · build ок · паритет i18n) и закоммичена:

- `72532d6` **Block в DM** (#18) — `user_blocks` + RLS (мигр. 054), реальная блокировка отправки, проверено на БД. Apple Guideline 1.2.
- `fc8af23` **escrow-баннер** в чате сделки (#20) — анти-скам «мимо платформы».
- `b6c2592` **Разбивка платежа до оплаты** (#2) — `paymentBreakdown()` в money.ts (5%/95%, +4 теста), аддитивный блок на экране оплаты. Честные числа, без выдуманного processing.
- `209b8ff` **Подсказка «Востаннє»** на последнем методе входа (#26) — `rememberLoginMethod`/`getLastLoginMethod`, бейдж на Apple/Google/email. Снижает дубли-аккаунты.
- `e4f1a38` **Детектор «мимо платформы» + предупреждение в DM** (#19) — `detectOffPlatform()` (+3 теста), инлайн-варнинг под сообщением собеседника.
- `cec97af` **verified-бейдж** контрагента в шапке чата и DM (#22).
- `8da95cb` **Апдейты получателя по сделке с фото/чеком** (#15) — `deal_updates` + RLS (мигр. 055, проверено на БД: постит только создатель, видят обе стороны); компонент `DealUpdates` в ActiveDeal (приватный бакет + signed URL).

Все правки UI — строго аддитивные, в токенах дизайн-контракта (цвета/шрифты/отступы не менялись).
Затронутые экраны: DirectChat, Chat, ActiveDeal, Auth. Миграции **054, 055** — локально; прод = D-001.

**Completable-here объём плана ИСЧЕРПАН** (7 фич выше). Остаток плана — только за гейтами:

- **D-003 (нет Deno/sandbox):** идемпотентность платежей, statement_descriptor, auto-release, UA-роутинг
  выплат, обёртка сырых ошибок провайдеров, авто-receipt/thank-you письма (edge send-email).
- **DATA-MODEL + money (крупные фичи):** #33 платные DM, #34/#35 типы в лайве, #38 push-лента открытия,
  #1 dispute-scoped заморозка, #10 chargeback-резерв, #24 risk-scoring, H-11 ledger-модель кошелька.
- **OWNER:** #3 tip opt-in, #13/#47 страница тарифов/Trust Center (тексты), #46 политика «без ретро-правил»,
  crash-reporting ключ (#42), срок auto-release (#5), локализация-вычитка (#45).
- **D-002** (вход) — владелец завтра; **D-004** — юрист; **D-001** — прод-миграции/деплой.

Визуально 5 компонентов подтверждены (реальный экран входа + превью на настоящем CSS, скриншоты владельцу).

## 9. Перестройка: мерчант-маркетплейс (2026-10-11) — по спеке `docs/REBUILD_MARKETPLACE_SPEC_2026-10-11.md`

Повод: на устройстве владелец увидел, что ролевая модель/IA/вёрстка не целостны (спонсор мог завести
магазин; экраны не связаны; разъезжается; ландшафт). Решения владельца — в спеке §0.
Роли: **sponsor · recipient · merchant(новая) · admin**. Магазин только у мерчантов. Подарок: спонсор
купил → отправил получателю (физ, адрес виден только мерчанту заказа). Мерчант = заявка + одобрение админом.

**Сделано (каждая фаза проверена, конвейер зелёный):**

- `e5600d1` **P0** — portrait-lock (Info.plist), overflow-x guard (index.css), магазин/дизайн/добавление
  товара скрыты у не-мерчантов (Shop.tsx), `UserRole += 'merchant'`.
- `21676bb` **P1** — миграция **056**: роль merchant, `is_merchant()`, RLS-гейт товаров/витрин по роли,
  `merchant_applications` + RLS, RPC `decide_merchant_application` (admin). Проверено на локальной БД
  (спонсор→заявка→одобрение→merchant→создаёт товар). Экран `BecomeMerchant` (/app/become-merchant),
  пункт меню «Стати продавцем» (не-мерчантам), раздел «Заявки продавців» в Admin. i18n uk/en/de.
  Миграция 056 — ТОЛЬКО локально; прод = D-001.

**Осталось (по спеке §8):**

- **P2** — ролевая навигация (разные табы/меню sponsor/recipient/merchant; убрать «+» создания запроса у не-получателей).
- **P3** — магазины мерчантов как первичная IA (не плоский каталог).
- **P4** — поток подарка: `shipping_addresses`, выбор бенефициара, `orders.beneficiary_id/is_gift/адрес/статус`,
  чекаут, экран «Подарунки» получателя, кабинет заказов мерчанта, приватность адреса (RLS/RPC).
- **P5** — выплаты мерчанта (Connect), уведомления, статусы доставки, возвраты/споры.

## 8. Самоаудит приложения (2026-10-08) — 4 параллельных агента + фиксы

Проверено: ~212 обработчиков/все роуты/42 словаря/конфиг iOS/код. **Общий вывод агентов: приложение в
хорошем состоянии — мёртвых кнопок, сломанной навигации, пропавших i18n-ключей НЕТ.** Найденное — исправлено:

**Исправлено и закоммичено (конвейер зелёный на каждом шаге):**

- `5ce96f5` H1 StartStream (не идём в live при ошибке INSERT), M1 убрана заглушка `"u1"` в отзыве,
  M2 alive-guards (useReviews/DealUpdates/ActiveDeal/Dispute/useSponsorReveal), M3 ReviewModal без сырой
  ошибки, M4 удалён мёртвый `useReviews.createReview`.
- `8744bda` MED-1 LivePage — честный бейдж «Приклад» + дисклеймер (убраны фейковые LIVE/счётчики зрителей);
  MED-2 Register читает `?role=executor`; LOW-1 FAQ q9 без несуществующего «вывода»; a11y label↔input
  (EditProfile/StorefrontEditor) + focus-ring (Search/ChatList/Admin/CreateDeal/RecipientPageEditor).
- `be2c28f` L1 StreamViewer донат (auth-гейт + тост ошибки), L2 дедуп realtime-нотификаций, L6 useProfile
  `maybeSingle`, L7 CreateDeal валюта в нижнем регистре.
- `df89a72` iOS: device family → iPhone-only, armv7→arm64, убраны iPad-ориентации.
- `6892282` a11y: aria-label на icon-кнопки (Cart/RecipientPageEditor), alt лайтбокса.

**НЕ фиксится мной — требует владельца/решения (НЕ блокирует сборку):**

- **Stripe price IDs** в `.env.production` (`VITE_STRIPE_PRICE_MONTHLY/_YEARLY`) — подписки деградируют
  мягко («Stripe не підключено»), не крашат. Владелец вписывает, когда включает подписки.
- **FX-cron ref:** `supabase/migrations/025_fx_cron.sql` хардкодит staging-проект `mlgyuonypcyseryrmcms`
  (прод — `wtevirwkshidxskqpvtu`). Перед накатом на прод (D-001) выровнять.
- **Admin-роут:** ролевой гейт client-side (`isAdmin` в Admin.tsx) + RLS в БД; подтвердить server-side RLS.
- **Публичные витрины** (RecipientPage/Catalog) ссылаются на protected `/app/*` → гость уходит на `/auth`;
  нужен публичный роут товара (решение владельца).
- **a11y (системно):** ~53 формы используют соседний `<label>` без `htmlFor` (спасает placeholder) —
  опциональный сквозной проход. MFA fail-open — задокументированный known-issue.
- `.env.production` в git-истории (только публичные anon/client-id, не секреты) — чистка не срочна.
