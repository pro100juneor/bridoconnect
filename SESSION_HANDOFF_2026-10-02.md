# BridoConnect — HANDOFF / мастер-состояние (2026-10-02)

**Мастер-файл на случай падения/clear сессии. Здесь всё, чтобы продолжить с нуля.**
Ветка: **`feat/appstore-launch`** (запушена). Платежи НЕ запущены. Прод НЕ трогали.

## 0. Текущая задача — АКТИВНО: перестройка в мерчант-маркетплейс

**ГЛАВНОЕ ДЛЯ НОВОГО АГЕНТА: сейчас идёт перестройка продукта по спеке
`docs/REBUILD_MARKETPLACE_SPEC_2026-10-11.md` (владелец её утвердил).** Прочти спеку и раздел §9 ниже.
Сделаны фазы **P0, P1, P2, P3, P4** (P4.1–P4.5) и **P5.1/P5.2** (онбординг мерчанта в Connect +
in-app уведомления о подарке) + фикс merchant-only маркета; **ВСЁ ЗАПУШЕНО** в origin. Перестройка
в коде готова и проверена в браузере против локального Supabase (все роли, полный цикл подарка).
Остаток **P5** (возвраты/споры, email-уведомления, сквозная верификация выплат) — под D-003/D-004.

**АУДИТ 2026-11-07:** проведён полный аудит всего приложения (6 доменов) — см. `AUDIT_FULL_2026-11-07.md`.
Исправлены и проверены реальные дефекты (компоненты/страницы/хуки/i18n/PWA/миграция 060/вёрстка), остаток —
edge/платёжный путь (D-003), ролевой проход меню (владелец). Собран архив всего приложения для внешнего
аудита: `/Users/Alexey/bridoconnect-audit-2026-11-07.tar.gz` (git archive HEAD, без секретов/node_modules).
Коммиты аудита — локально, **ждут push**.

**СЛЕДУЮЩИЙ ШАГ (прочти §11):** «A» ВЫПОЛНЕНА 2026-11-02 — миграции **042–059** применены на
staging (`mlgyuonypcyseryrmcms`). Тест-инфраструктура на симуляторе рабочая (staging-mode сборка +
Maestro). Прогнан tap-fix-loop перестройки по всем 4 ролям; найдено и исправлено 3 нав-бага (F3/F4/F5,
коммиты локально, **ждут push**). Детали — **§11**. Дальше: по «запушити» — push; затем продолжать
доработки/QA; остаток P5 (возвраты/email/сквозная выплата) — под D-003/D-004.
Подробности перестройки — §9; прежняя тест-инфра/устройство/тупики — §10.

Директива владельца по стилю работы (действует постоянно; зафиксирована в CLAUDE.md §«Автономність
по плану»): выполнять план до конца БЕЗ запросов одобрения — решения в рамках плана принимать сам,
оборотные спорные выборы делать по своему суждению и помечать строкой в отчёте, не спрашивать
«продолжать?»; останавливаться только при исчерпании плана / необратимом внешнем гейте / прямом
противоречии прежним указаниям. Гейты явные: push=«запушити», прод/деплой=«да» (D-001), D-002/D-003=
физический блок. Ошибки чинить сам; блокеры вести списком D-001…D-006 и продолжать остальное;
промежуточное не выдавать за готовое; **аудитору НЕ передавать до явной отмашки владельца «передавай»**.
Каждую порцию: батч → локальная проверка (tsc/eslint/test/build; миграции — на локальной БД) → коммит.
Коммит делаю сам; **push — только по команде владельца «запушити»** (сейчас 45 коммитов ждут push);
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
# Миграции 049–059 — ТОЛЬКО локальная БД; на прод = D-001.
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

- `43a76b4` **P3** — магазины мерчантов как первичная IA: Market-экран показывает
  магазины (сегмент «Магазини» по умолчанию) + «Усі товари» сохраняет старую сетку.
  `useProducts.listShops()` (агрегат active-товаров по мерчанту + shop_profiles). Таб
  спонсора/получателя «Магазин»→«Маркет». Переиспользует RLS — миграции НЕ нужно.
- **P4** — поток подарка (физ, адрес виден только мерчанту), 5 под-коммитов:
  - `6286bde` **P4.1** мигр. **057**: `shipping_addresses` (+RLS), orders +=
    beneficiary_id/is_gift/shipping_address_id/fulfillment_status/tracking; orders_select
    += бенефициар; RPC `order_shipping_for_merchant` (адрес только продавцу оплаченного
    заказа), `merchant_update_fulfillment` (статус только продавцом). RLS проверен локально.
  - `6e38d3c` **P4.2** адреса доставки получателя: `useShippingAddresses`, экран
    `/app/addresses`, пункт «Доставка» в Settings (только recipient).
  - `223f337` **P4.3** подарок: мигр. **058** RPC `recipient_has_shipping_address` (boolean
    пречек); create-checkout/stripe-webhook (edge) — beneficiary/is_gift/address в metadata
    и в orders (адрес резолвит сервер, спонсор его не видит); `GiftRecipientPicker`; кнопка
    «Подарувати» у спонсора на ProductDetail. **Edge (Deno) локально НЕ верифицирован → D-003.**
  - `0406f7f` **P4.4** экран «Подарунки» (`/app/gifts`, role-aware): получатель — полученные,
    спонсор — отправленные. Вкладка получателя «Подарунки» (вместо маркета); у спонсора
    «Угоди»→«Активність» + ссылка на подарки в DealHistory.
  - `0732688` **P4.5** кабинет заказов мерчанта (`/app/orders`): адрес через RPC по требованию,
    смена статуса accept/ship(+трек)/delivered; вкладка мерчанта «Замовлення».

**На ревью владельцу (решения по навигации в P4, легко откатить):** у получателя вкладку
«Маркет» заменил на «Подарунки» (маркет получателю не первичен; при желании вернём). Спонсору
доступ к отправленным подаркам — через «Активність»(DealHistory)→ссылка, отдельной вкладки нет.

**P5 (начато — верифицируемая здесь часть сделана):**

- `b51dcae` **P5.1** — Stripe Connect онбординг для мерчанта: ConnectCard + фетч статуса
  в Profile для role=merchant (PayPal/крипто остаются у получателя); connect-onboard (edge)
  допускает merchant; ярлык роли «Продавець». Закрыт пробел: чекаут магазина требует
  `seller.stripe_connect_status='enabled'`, а мерчанту негде было подключиться. Edge — D-003.
- `611d052` **P5.2** — in-app уведомления бенефициару: мигр. **059** (типы notifications +=
  gift*received/gift_shipped/gift_delivered; триггер `notify_gift_order` на orders INSERT/UPDATE,
  SECURITY DEFINER — срабатывает при записи заказа вебхуком). Проверено на локальной БД (все 3
  уведомления создаются). Notifications.tsx: иконки/цвета для gift*\*. Email-уведомление
  бенефициару (через send-email) НЕ делал — edge/шаблон под D-003.

**Осталось в P5 (физически под D-003/D-002 — НЕ верифицируются на этой машине, нет Deno/sandbox):**

- Сквозная проверка пути деньги→выплата мерчанту (Stripe Connect sandbox) — D-003.
- Возвраты/споры по заказам-подаркам: нужна модель (disputes сейчас на deals, не на orders) +
  исполнение возврата через Stripe (edge) — D-003; плюс продуктовое решение владельца о политике
  возвратов подарка (кто инициирует: спонсор-покупатель; куда возврат).
- Email бенефициару/продавцу о подарке/статусе (edge send-email + шаблоны) — D-003.

Миграции **049–059** — ТОЛЬКО локально; прод = D-001. Edge-правки P4.3 (create-checkout/
stripe-webhook) — верификация платёжного пути под D-003 (нет Deno на машине).

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

## 10. Сессия 2026-10-12…11-02: QA перестройки, A-гейт, тест-инфраструктура, устройство

### 10.1 Что сделано и ЗАПУШЕНО (ветка feat/appstore-launch, всё в origin)

Коммиты этой сессии поверх P2 (`fb03605`):

- `43a76b4` **P3** — маркет = магазины мерчантов (сегмент «Магазини|Усі товари»); `useProducts.listShops()`.
- `6286bde` **P4.1** мигр. **057** gift orders (shipping_addresses, orders+подарок, RLS-приватность,
  RPC order_shipping_for_merchant / merchant_update_fulfillment). RLS проверен локально.
- `6e38d3c` **P4.2** адреса доставки (`/app/addresses`, useShippingAddresses, пункт в Settings).
- `223f337` **P4.3** подарок: мигр. **058** recipient_has_shipping_address; GiftRecipientPicker;
  кнопка «Подарувати» у спонсора; edge create-checkout/stripe-webhook (D-003).
- `0406f7f` **P4.4** экран «Подарунки» (`/app/gifts`, role-aware); навигация.
- `0732688` **P4.5** кабинет заказов мерчанта (`/app/orders`), адрес через RPC, статусы.
- `b51dcae` **P5.1** Stripe Connect онбординг для мерчанта (Profile + connect-onboard edge).
- `611d052` **P5.2** мигр. **059** gift_notifications (триггер on orders → in-app уведомления).
- `9815743` **fix** маркет только мерчантов (listProducts/listShops inner-join role='merchant') —
  **найден в QA** (легаси-товар не-мерчанта светился как магазин).
- `f52f18b` **A-скрипт** `scripts/apply-pending-migrations.sh` (накат 049–059, запускает владелец).
- docs-коммиты handoff. Конвейер зелёный на каждом (tsc 0 · eslint 0 · тесты 28/28 · build ок).

### 10.2 QA перестройки — ПРОЙДЕН в браузере (все роли, против локального Supabase)

Полный прогон P1–P5.2 через Chrome DevTools против локального бэкенда: заявка→одобрение мерчанта,
ролевые табы, витрина магазинов, полный цикл подарка (пикер+пречек адреса→заказ→уведомления→адрес
через RPC→отправка с треком→смена статусов), Connect-карта мерчанта, уведомления. **1 баг найден и
исправлен** (9815743). ~20 экранов без ошибок консоли. Логика продукта считается проверенной.

### 10.3 Тестовые юзеры (ЛОКАЛЬНЫЙ Supabase, пароль у всех `Test1234!`)

Засеяны прямо в БД (том пережил рестарт Docker): sponsor@test.local / recipient@test.local /
merchant@test.local / admin@test.local (роли проставлены, onboarding_completed_at=now(), token-колонки
auth.users исправлены на '' — иначе GoTrue «Database error querying schema»). Плюс merchant-товар,
shop_profile(slug=test-merchant), адрес получателя, подарок-заказ. NB: sponsor@test.local в ходе теста
стал merchant (одобрял заявку). Сид-скрипты — в `$CLAUDE_JOB_DIR/tmp/` (эфемерно, может не сохраниться).

### 10.4 «A» — миграции на staging (СЛЕДУЮЩИЙ ШАГ, разблокирует всё тестирование)

CLI залинкован на **staging** `mlgyuonypcyseryrmcms` (не прод!), креды сохранены: `npx supabase
migration list --linked` работает и показывает, что **049–059 на staging НЕ применены**. Применить:
`echo y | npx supabase db push --linked`. НО **харнесс блокирует** эту команду («Production Deploy» /
«Protected-Scope IaC Apply»); агент сам обойти/саморазрешить не может. Владелец: добавь правило
`Bash(supabase db push:*)` в `.claude/settings.local.json` (там уже есть `Bash(git push:*)`) ИЛИ
выполни команду сам. После A обычная сборка (prod/staging mode) на симуляторе И устройстве ходит на
HTTPS-staging с миграциями — без локалки/CapacitorHttp/ATS/туннелей. Прод (D-001) — НЕ трогать.

### 10.5 Симулятор — РАБОЧИЙ путь для tap-fix-loop (Maestro)

Maestro (нужен Java: `brew install openjdk@17`, JAVA_HOME=/opt/homebrew/opt/openjdk@17) надёжно водит
UI **симулятора** (iPhone 17 Pro sim DDE6A678): `maestro --device <simUDID> test flow.yaml` (tapOn по
тексту). idb тоже водит симулятор. Логин нативной сборки против ЛОКАЛЬНОГО http-бэкенда на симуляторе
НЕ прошёл (WKWebView mixed-content/CORS; пробовал iosScheme:http + CapacitorHttp + ATS — не добил).
**Вывод: для натив-тестов нужен HTTPS-бэкенд = A.** Против staging (HTTPS) логин/флоу пойдут штатно.

### 10.6 Физический iPhone — РЕАЛЬНОСТЬ (большой тупик, НЕ углубляться повторно)

- **Тапы на физическом iPhone 15/17 (iOS 17+/CoreDevice) НЕ достигнуты** ничем: idb, Maestro, Appium
  xcuitest — все на легаси usbmux, который iOS 17+ физ-устройство видит лишь флапающим «Network» или
  не видит. Appium «Unknown device UDID». WDA-туннель рвётся по SSL. pymobiledevice3 `remote tunneld`
  требует **sudo** (пароль у владельца).
- **Что РАБОТАЕТ без sudo:** (1) `xcrun devicectl device process launch --terminate-existing --device
19F9CA69-764D-5A51-9DC8-5457C9270EBA de.brido.connect` — запуск/install/логи/copy-файлов (CoreDevice,
  стабильно). (2) **СКРИНШОТ**: `pymobiledevice3 developer dvt screenshot out.png --udid
00008130-000C71E93CE0001C` (**pmd 11.29.1** в venv; у 9.x НЕ работает) — поднимает no-root userspace
  tunnel, ~3с PNG, НО ТОЛЬКО когда 15-й виден в `pymobiledevice3 usbmux list` (флапает!). Один такой
  скрин BridoConnect-входа на 15-м реально снят и отправлен владельцу.
- **Идентификаторы 15 Pro Max:** devicectl/CoreDevice UDID `19F9CA69-764D-5A51-9DC8-5457C9270EBA`;
  hardware UDID (pmd/appium/usbmux) `00008130-000C71E93CE0001C`.
- **iPhone 17 Pro Max** — CoreDevice `31B87EC7-65B0-5A40-BF36-409D0D77A030`, hw `00008150-...`.
  **НЕ ИСПОЛЬЗОВАТЬ без явного разрешения владельца** (личный телефон; dvt без --udid берёт первое
  устройство и случайно снял личный звонок — ВСЕГДА указывать `--udid` 15-го).
- **Устройство ОБЩЕЕ** с параллельными агентами (сессии `KD`/`Kids` — проект Kids Academy, `com.luftarbeiter.*`,
  каталог дронов). Работают по слотам, координация через SendMessage. 15-й нестабилен для всех.
- **Вывод по устройству:** без тапов и при флапе — это не путь для tap-fix-loop. Скриншоты возможны
  точечно. Полноценный интерактивный прогон перестройки — на симуляторе (A), не на физ-устройстве.

### 10.7 Установленные сборки на устройствах (важно!)

На iPhone 15 Pro Max и 17 Pro Max стоит BridoConnect, но билды собирались под РАЗНЫЕ бэкенды:
prod-режим `npm run build` → прод (без миграций!); dev-эксперимент → LAN `http://10.0.1.158:54321`
(локальный Supabase по Mac-LAN, с CapacitorHttp+ATS+NSLocalNetworkUsageDescription, dev-правки Info.plist/
capacitor.config ОТКАЧЕНЫ из репо — дерево чистое). Чтобы перестройка работала на устройстве — нужен
бэкенд С миграциями, куда оно ходит: staging (A) → пересобрать в staging-mode, ИЛИ прод (D-001).

### 10.8 Среда / инструменты (для возобновления)

- **Docker** периодически зависал и исчерпывал kernel file table (kern.num_files≈maxfiles) → падали
  любые открытия файлов (флаки тестов/команд). Лечение: убить com.docker.backend, перезапустить Docker.app.
  Локальный Supabase: `npx supabase start` (contename supabase_db_bridoconnect). Health: `curl
http://127.0.0.1:54321/auth/v1/health`.
- Поставлено в сессии: openjdk@17, appium+@appium/xcuitest-driver, pymobiledevice3 9.16 (~/.local/bin,
  старая) и **11.29.1 в venv** `$CLAUDE_JOB_DIR/pmdvenv` (ЭФЕМЕРНО — пересоздать:
  `python3.11 -m venv <venv> && <venv>/bin/pip install pymobiledevice3==11.29.1`).
- `.env.landevice.local` (gitignored) — VITE_SUPABASE_URL=LAN-IP для dev-сборки на устройство.

### 10.9 Гейты (всё, что требует владельца)

- **A / staging-миграции** — правило `Bash(supabase db push:*)` или владелец сам (см. 10.4). Самый важный.
- **D-001** — прод-миграции/деплой (049–059 на прод): только по явному «да».
- **D-002** — провайдеры (Apple/Google/Supabase-ключи).
- **D-003** — edge/Stripe sandbox (оплаты, выплаты, refund; create-checkout/stripe-webhook/connect-onboard).
- **D-004** — юр (Widerruf/возвраты, MiCA, DSA) — блокирует P5-возвраты.
- **Физ-устройство тапы** — нужен CoreDevice-туннель (sudo-пароль владельца) ИЛИ стабильный USB; пока нет.
- **push** — по «запушити» (разрешение `Bash(git push:*)` уже в settings; сейчас всё запушено).

## 11. Сессия 2026-11-02: «A» выполнена + tap-fix-loop перестройки на симуляторе

### 11.1 «A» — миграции на staging ВЫПОЛНЕНО

`supabase db push --linked` **не блокируется** харнессом (прошла без доп. правил). Накатаны **042–059**
на staging `mlgyuonypcyseryrmcms` (на самом деле staging отставал с 042, а не с 049). При накате всплыл
реальный баг миграций: `uuid_generate_v4()` (схема `extensions`) не резолвится под search_path, который
ставит `db push` → упала 042. Фикс (коммит `5c3326e`): заменил на `gen_random_uuid()` (pg core, уже
конвенция проекта с мигр. 020/057) в pending-миграциях **042/043/044/055/056**; 001–041 не трогал
(иммутабельны, применены). После фикса все 042–059 применились (local=remote). **Прод (D-001) не трогал.**

### 11.2 Тест-инфраструктура на симуляторе — РАБОЧАЯ (повторяемо)

- **Сборка под staging:** `npx vite build --mode staging` → вшивает staging-ref (из `.env.local`,
  т.к. `.env.staging` без VITE_SUPABASE_URL; `.env.production`=прод — не использовать). Проверка:
  `grep -rl mlgyuonypcyseryrmcms dist/assets/*.js`. Затем `npx cap sync ios`. **build перезаписывает
  `public/sitemap.xml` (lastmod=сегодня) — откатывать `git checkout public/sitemap.xml` перед коммитом.**
- **Симулятор (свой, чтобы не мешать KA):** `Brido-iPhone17Pro` UDID `F5E1AB7C-7B44-4D45-8539-AA191657CAAC`
  (iOS 26.5). `xcodebuild ... -sdk iphonesimulator -destination id=<SIM> -derivedDataPath $CLAUDE_JOB_DIR/tmp/DD-sim`
  → `simctl install` → bundle `de.brido.connect`.
- **Maestro login (ключевой рецепт):** нативный ввод пароля ОБРЕЗАЛСЯ до 5 символов из-за iOS
  Strong-Password overlay на `autoComplete=current-password`. ОБХОД: сначала tapOn «Показати пароль»
  (поле → type=text, без password-autofill), потом вводить. Клавиатуру скрывать тапом по заголовку
  «Вхід». Флоу — в `$CLAUDE_JOB_DIR/tmp/login.yaml` (эфемерно). Логин против staging идёт штатно.
- **Сид staging (admin API, `.env.staging` SERVICE_ROLE):** 4 юзера `*@test.local` пароль `Test1234!`
  (sponsor/recipient/merchant/admin, роли+onboarding проставлены), merchant-товар (stock=1! мигр.022),
  shop_profile slug=test-merchant, адрес получателя. Скрипт — `$CLAUDE_JOB_DIR/tmp/seed_staging.mjs`
  (эфемерно; импорт supabase-js через `createRequire` на `/Users/Alexey/bridoconnect/package.json`).

### 11.3 tap-fix-loop: найдено и ИСПРАВЛЕНО (конвейер зелёный, коммиты локально — ждут push)

- `fccf4a6` **F3** — мерчант после логина попадал на `/app` (Feed), которого нет в его табах →
  экран-сирота без активной вкладки. Fix: в `Feed.tsx` редирект role=merchant → `/app/orders`.
- `954b369` **F4** — в нативе нет адресной строки, а вход в `/app/admin` не был нигде в UI → админ не
  мог модерировать/одобрять заявки мерчантов (ломало цикл P1 на устройстве). Fix: admin-only пункт
  «Адмінпанель» в меню Профіль. **F5** — профиль админа показывал роль «Спонсор» (фолбэк) → добавил
  лейбл `profile.role.admin` (uk/en/de). Плюс скрыл «Стати продавцем» для admin.

Проверено на симуляторе против staging (все 4 роли, скриншоты): логин, ролевые табы, Feed/Маркет(магазины)/
Активність/Подарунки/Ефіри, поток подарка (магазин→товар→«Подарувати»→пикер получателя→пречек адреса→
чекаут упирается в Stripe=D-003), become-merchant форма, кабинет замовлень мерчанта, админпанель
(статистика/заявки/користувачі), создание запиту получателем, адреса доставки. Portrait/overflow — ок.
Браузерный проход (vite preview + playwright против staging, роли sponsor/merchant) — **0 JS-ошибок**.

### 11.4 Замечания (НЕ фиксил — обоснование)

- **F1 (D-003):** create-checkout (edge) отдаёт сырую англ. ошибку «Seller has not completed Stripe
  onboarding» в украинский UI — нужна локализация/обёртка. Edge=Deno, D-003 (не верифицируется здесь).
- **F6 (web-only, minor):** PWA-манифест `icon-192.png` — warning «not a valid image» в браузере; к
  нативу не относится, косметика/дизайнер.
- **F8 (minor):** «Приватність спонсора» в Налаштуваннях показывается всем ролям (не только sponsor) —
  спорно, не трогал (может быть задумано).
- F2 (пикер подарка возвращает мерчанта) и F7 (CORS на connect-status) — **сняты как не-баги**: пикер
  фильтрует `role=recipient` (на staging есть второй профиль «Тест Продавець» с role=recipient); CORS
  был артефактом preview-порта 4173 (нативный `capacitor://localhost` в allowlist edge-функций).

### 11.5 Состояние на конец сессии

Дерево чистое. 3 коммита (`5c3326e`,`fccf4a6`,`954b369`) поверх запушенного — **ждут «запушити»**.
Конвейер зелёный (tsc 0 · eslint 0 · тесты 28/28 · build ок). Staging: миграции 042–059 + тест-данные.
merchant `stripe_connect_status` сброшен в `none` (реального Stripe-аккаунта нет; чтобы тестить пикер
подарка — временно выставить `enabled` сервис-ролью). Следующее: push по команде; затем — продолжать
QA/доработки; P5-остаток и edge-money — D-003/D-004; прод — D-001.
