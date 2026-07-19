# BridoConnect — Детальний план (pinned)

> Закріплений план перетворення проєкту з «сторінкового» стану у повноцінний
> застосунок. Оновлюється в міру виконання. Порядок = черговість виконання.

Легенда: ✅ зроблено · 🟡 код готовий, чекає ключі/деплой · ⬜ не почато · 🔒 гейт на зовнішні ключі/акаунти.

---

## ✅ Фаза 0 — Бекенд (staging) — ЗРОБЛЕНО

Staging-проєкт Supabase `mlgyuonypcyseryrmcms` (Frankfurt).

- ✅ Міграції 001–022 застосовані.
- ✅ 8 core edge-функцій задеплоєні (create-checkout, stripe-webhook, connect-\*, release-escrow, refund-deal, create-stream-token, send-email).
- ✅ Storage: `avatars`, `product-images`.
- ✅ Фронт переключено на staging (`.env.local`).
- ✅ Перевірено вживу: auth + RLS + DB-каталог (login → товар з БД у магазині).

---

## 🟡 Фаза 1 — Платежі (Stripe Connect) — код готовий, гейт на ключі 🔒

Потрібно: `STRIPE_SECRET_KEY` (sk*test*…), `VITE_STRIPE_PUBLISHABLE_KEY` (pk*test*…), Connect увімкнено, `STRIPE_WEBHOOK_SECRET`.

1. ⬜ `supabase secrets set STRIPE_SECRET_KEY … STRIPE_WEBHOOK_SECRET …` на staging.
2. ⬜ Налаштувати Stripe webhook endpoint → `…/functions/v1/stripe-webhook`, взяти signing secret.
3. ⬜ Прописати `VITE_STRIPE_PUBLISHABLE_KEY` у `.env.local`, ребілд.
4. ⬜ Сквозний тест (test-mode картками): onboarding отримувача → donate по угоді → escrow → release → refund/dispute.
5. ⬜ Донат в ефірі та покупка в магазині (destination charge, 5% fee, мультивалюта).
6. ⬜ KYC-гейт (Sumsub) перед виплатами.
7. ⬜ Перевести в live-режим (реальна картка, мін. сума).
   **Готово, коли:** реальна EUR-транзакція проходить sponsor → recipient з комісією та escrow.

---

## 🟡 Фаза 2 — Ефіри (LiveKit) — код готовий, гейт на ключі 🔒

Потрібно: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WS_URL` (LiveKit Cloud).

1. ⬜ `supabase secrets set LIVEKIT_*` на staging.
2. ⬜ Тест на iPhone: реальна трансляція з камери + перегляд з другого пристрою.
3. ⬜ Чат по data-каналу, лічильник глядачів, донат у прямому ефірі (Фаза 1).
4. ⬜ Завершення ефіру: статистика збору.
   **Готово, коли:** з iPhone можна вийти в ефір, другий пристрій бачить відео і донатить.

---

## ⬜ Фаза 3 — Магазин

### 3.1 ✅ Ядро — ЗРОБЛЕНО (код)

products/orders/RLS, каталог з БД, сторінка товару, профіль продавця, створення товару, покупка (destination charge).

### 3.2 ✅ Правила — ЗРОБЛЕНО (код)

- ✅ Одна позиція = одна одиниця (stock ∈ {0,1}).
- ✅ Глобальний ліміт магазину 5000 позицій (тригер).
- ✅ Кошик + продаж кількох позицій одного продавця (order_items).
- ✅ Конвертація ціни за валютою регіону/налаштування (currency_rates + useCurrency); базове зберігання в EUR.
- 🔒 Реальна оплата кошика — чекає Фазу 1.
- ✅ **Живий FX-feed** — edge `refresh-fx-rates` (open.er-api.com, без ключа) + pg_cron щодня (міграція 025); курси в `currency_rates` живі.

### 3.3 ✅ Медіа товару — ЗРОБЛЕНО (код, на staging)

Вимога: до **20 фото** + до **5 відео** (≤ **30 с** кожне) на товар.

1. ⬜ Міграція 023: `products.videos text[] default '{}'`; storage-бакет `product-videos` (public read, owner-folder insert). Обмеження: images ≤20, videos ≤5 (перевірка в тригері/додатку).
2. ⬜ `useProducts.createProduct/updateProduct`: завантаження до 20 фото + до 5 відео у Storage; клієнтська валідація кількості, розміру та **тривалості відео ≤30с** (читати `HTMLVideoElement.duration` перед upload).
3. ⬜ `CreateProduct.tsx`: мульти-uploader (фото+відео) з прев'ю, лічильники «X/20», «Y/5», відсів довгих відео з тостом.
4. ⬜ `ProductDetail.tsx`: галерея фото + плеєр(и) відео (свайп/каруселька у стилі проєкту).
5. ⬜ (опц.) легка модерація/трансcoding поза скоупом — відмітити.
   **Готово, коли:** продавець вантажить фото+відео, покупець їх бачить на сторінці товару.

### 3.4 ✅ Брендовані вітрини магазинів — ЗРОБЛЕНО (код, на staging; перевірено /store/:slug)

Вимога: у кожного магазину — **власна сторінка**; **200 абсолютно різних стилів** зі змінними блоками; **логотип** компанії; **контакти** + зв'язок через **месенджери** від магазину до клієнта; кожна компанія оформлює під своїм логіном.

1. ⬜ Міграція 024: `shop_profiles` (seller_id pk → profiles, slug text unique, theme_id int, logo_url text, brand jsonb {primaryColor, accentColor, font}, contacts jsonb {phone,email,address,site}, messengers jsonb {whatsapp,telegram,viber,signal,messenger}, blocks jsonb {order[], hidden[], overrides}, updated_at). RLS: public read, owner write. Storage-бакет `shop-logos`.
2. ⬜ **Theme-движок**: реєстр із 200 пресетів, згенерованих з матриці _layout × палітра × типографіка × стиль блоків_ (напр. 10 layout × 5 палітр × 4 шрифтові системи = 200), кожен пресет = набір токенів + шаблон розкладки блоків. Файл `src/storefront/themes.ts` (генератор) + `ThemeRenderer`.
3. ⬜ **Змінні блоки**: Hero (лого+банер), About, Каталог товарів, Контакти, Месенджери, Відгуки, Промо — з можливістю ввімкнути/вимкнути та переставити (`blocks` у shop_profiles).
4. ⬜ **Публічна сторінка магазину** `/store/:slug` (без логіну) — рендер вітрини за theme_id + shop_profiles + товари продавця. «При переході на магазин відкривається його оформлена сторінка».
5. ⬜ **Редактор вітрини** `/app/shop/design` (за логіном продавця): вибір з 200 тем (галерея-прев'ю), завантаження логотипу, палітра, контакти, месенджери, порядок/видимість блоків, live-прев'ю, збереження.
6. ⬜ **Месенджер-зв'язок**: кнопки deep-link `wa.me/…`, `t.me/…`, `viber://…`, `signal.me/…`, `m.me/…` з даних магазину; базове розміщення контактів.
7. ⬜ Прив'язати перехід із каталогу/картки продавця на `/store/:slug`.
   **Готово, коли:** продавець під своїм логіном обирає 1 із 200 тем, ставить лого/контакти/месенджери, і публічна сторінка `/store/:slug` відображає його брендований магазин з товарами.

---

## ⬜ Фаза 4 — Продакшн-обвязка та розкатка

1. 🟡 Email-сповіщення на події (оплата угоди/ефіру/товару, release escrow) — тригери підключено (webhook + release-escrow, `_shared/email.ts`). Відправка вмикається з 🔒 `RESEND_API_KEY` + домен.
2. ⬜ Observability вживу (Sentry/PostHog + consent) 🔒 ключі.
3. ✅ Код-спліт важких маршрутів — livekit (~511 КБ) + storefront вантажаться lazy; головний бандл 1000 → 489 КБ (142 КБ gzip).
4. ⬜ E2E проти staging (playwright-набір є) — з піднятим бекендом.
5. ⬜ iOS: TestFlight → App Store 🔒 Apple акаунт.
6. ⬜ Хостинг фронту: Vercel (staging→prod) або Docker-стек.
7. ⬜ Розморозити інші платіжні процесори (PayPal/Adyen/dLocal/crypto/Wise) за потребою ринків.

---

## Критичний шлях і залежності

`Фаза 0 ✅` → `Фаза 1 (Stripe)` розблоковує оплату скрізь (угоди, донати ефірів, магазин).
`Фаза 2 (LiveKit)` та `Фаза 3.3/3.4` можуть іти паралельно після Фази 1.
`Фаза 4` — фінал.

## Гейти на ключі (потрібні від власника)

| Ключ                                     | Розблоковує                          |
| ---------------------------------------- | ------------------------------------ |
| STRIPE*SECRET_KEY + webhook secret + pk* | Фаза 1: усі платежі, донати, покупки |
| LIVEKIT_API_KEY/SECRET/WS_URL            | Фаза 2: відео-ефіри                  |
| RESEND_API_KEY + домен                   | Фаза 4: email-сповіщення             |
| SUMSUB_APP_TOKEN/SECRET                  | Фаза 1: KYC перед виплатами          |
| Apple Developer (TestFlight)             | Фаза 4: розкатка iOS                 |
