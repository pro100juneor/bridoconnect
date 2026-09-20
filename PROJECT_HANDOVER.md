# BridoConnect — передача проекта на аудит

Дата пакета: 20.09.2026 · Версия в App Store: 1.0 (READY_FOR_SALE) · Ветка: main

## 1. Что это

P2P-платформа гуманитарной помощи Украине: спонсоры (в основном диаспора и жители ЕС)
напрямую финансируют запросы получателей — деньги, товары, задания, жильё, лекарства.
Дополнительно: магазин получателей, прямые эфиры, платное продвижение профилей.
Оператор: Luftarbeiter / Oleksii Kusov (Германия), Steuernummer 223/242/09623,
USt-IdNr DE359345814.

## 2. Стек

| Слой        | Технологии                                                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web         | React 18 + TypeScript + Vite, Tailwind, framer-motion, i18n (uk основной)                                                                                   |
| iOS         | Capacitor 8 (WebView-обёртка), Xcode-проект в `ios/App`                                                                                                     |
| Backend     | Supabase: Postgres + RLS, Auth (GoTrue), Storage, Edge Functions (Deno)                                                                                     |
| Платежи     | Stripe (Checkout + Connect destination charges) — основной рейл; код для PayPal / Adyen / Wise / dLocal / BTCPay присутствует, но эти рейлы не активированы |
| KYC         | Stripe Identity (hosted flow)                                                                                                                               |
| Хостинг web | Vercel, автодеплой из `main`                                                                                                                                |

## 3. Структура репозитория

```
src/                  клиент: pages/ (public + app), hooks/, components/, i18n/
supabase/migrations/  41 SQL-миграция — полная схема БД
supabase/functions/   24 edge-функции (Deno) + _shared/ хелперы
ios/App/              Capacitor iOS-проект
tests/e2e/            Playwright-сьюты (chromium + iphone-webkit проекты)
scripts/              сиды, генератор sitemap, релизные скрипты
docs/                 проектные документы (KYC-хранение и др.)
Dockerfile, nginx/    альтернативный self-hosted деплой (не используется)
```

## 4. Окружения

| Среда    | Supabase project ref          | Фронт                           |
| -------- | ----------------------------- | ------------------------------- |
| Локально | CLI `supabase start` (Docker) | `npm run dev`                   |
| Staging  | `mlgyuonypcyseryrmcms`        | превью-сборки                   |
| Prod     | `wtevirwkshidxskqpvtu`        | https://bridoconnect.vercel.app |

Секреты в пакет не входят (см. §7). Названия всех переменных — в `.env.example`.
`.env.production` содержит только публичный anon-key (это нормально для Supabase).

## 5. Как запустить и проверить

```bash
npm install
npm run dev                      # dev-сервер (нужен .env.local с ключами Supabase)
npx tsc --noEmit                 # типы: 0 ошибок
npx eslint src --max-warnings=0  # линт: 0 предупреждений
npm run build                    # прод-сборка
# e2e (нужен Docker для локального Supabase):
supabase start && npx playwright test --project=chromium
```

Тестовых аккаунтов на проде больше нет: `buyer@brido.local` и
`seller@brido.local` удалены 20.09.2026 вместе с тремя демо-товарами. Для
проверки поведения поднимайте локальный стек — `scripts/seed-local.mjs`
создаёт полный набор ролей. Состояние прод-базы и оставшиеся админские
учётки описаны в `docs/PROD_STATE.md`.

## 6. Статус на дату передачи

- App Review Apple пройден (6+2 замечания устранены), версия 1.0 одобрена;
  доступность включена в 173 странах 12.09, идёт пропагация в стор.
- Stripe работает в **тестовом режиме** — реальные платежи ещё не включены.
- 20.09.2026 в `main` слита ветка `feat/stripe-connect-p1` (три волны работы,
  копившиеся с 12.06). До этого живой сайт показывал выдуманную статистику,
  потому что Vercel деплоит только `main`. Сейчас публичные страницы берут
  цифры из `public_platform_stats()` и на пустой базе показывают нули.
- e2e: 137 passed / 0 failed (`npx playwright test --project=chromium`).
- Полный список известных ограничений и долгов — в `KNOWN_ISSUES.md` (честный,
  без купюр — читать вместе с этим файлом).

## 7. Что исключено из пакета и почему

- `node_modules/`, `dist/`, iOS build-артефакты — восстанавливаются `npm install` / сборкой;
- локальные env-файлы с секретами (`.env`, `.env.local`, `.env.staging`,
  `.env.prod-db-pass`) — ключи сервисов не передаются в архивах никому,
  включая аудиторов; список переменных см. `.env.example`;
- ключи App Store Connect API, сертификаты подписи iOS;
- пароли админов и сервисные токены.

Это не «утаивание» частей проекта: весь исходный код, схема БД, функции, тесты
и документация включены полностью. Git-история доступна в репозитории
`github.com/pro100juneor/bridoconnect` — по запросу выдаётся read-доступ.
