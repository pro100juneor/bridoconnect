# BridoConnect 🇺🇦

> P2P-платформа гуманітарної допомоги: спонсори напряму фінансують запити
> отримувачів — гроші, товари, завдання, ліки, житло. Плюс магазин отримувачів,
> прямі ефіри та платне просування профілів.

**Web:** [bridoconnect.vercel.app](https://bridoconnect.vercel.app) ·
**iOS:** App Store, версія 1.0 (Capacitor-обгортка того самого фронтенду)

> ⚠️ Stripe працює в **тестовому режимі** — справжні платежі ще не увімкнені.
> Повний, без купюр, список обмежень і техборгу — [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md).
> Оглядова довідка по проєкту для передачі — [`PROJECT_HANDOVER.md`](PROJECT_HANDOVER.md).

## Стек

| Шар | Технології |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite 5, React Router 6, TanStack Query |
| UI | Tailwind CSS, shadcn/ui (Radix), framer-motion, lucide-react, sonner |
| iOS | Capacitor 8 (`@capacitor/ios`), Xcode-проєкт у `ios/App` |
| Auth | Supabase Auth (email+пароль, TOTP MFA; Google OAuth приховано на iOS) |
| БД | Supabase PostgreSQL + RLS (39 міграцій) |
| Realtime | Supabase Realtime — повідомлення (`postgres_changes`) і presence у чаті |
| Storage | Supabase Storage (аватари, документи, зображення товарів) |
| Backend-логіка | Supabase Edge Functions (Deno) — 23 функції |
| Платежі | Stripe Checkout + Connect (destination charges) + Billing (Premium) |
| Інші рейли | PayPal / Adyen / Wise / dLocal / BTCPay — код є, не активовані |
| KYC | Stripe Identity (hosted flow) |
| Live-відео | LiveKit (WebRTC) |
| Observability | Sentry + PostHog (DSN/ключі на проді не задані) |
| Тести | Playwright (e2e), Vitest (налаштований, файлів поки 0) |
| Deploy | Vercel (автодеплой з `main`); альтернативно Docker + Caddy/nginx |

## Команди

```bash
npm install
cp .env.example .env.local     # заповнити щонайменше VITE_SUPABASE_*

npm run dev                    # dev-сервер Vite
npm run build                  # прод-збірка (prebuild генерує sitemap)
npm run preview                # переглянути прод-збірку

npm run typecheck              # tsc --noEmit -p tsconfig.app.json
npm run lint                   # eslint src --max-warnings=0
npm test                       # vitest run
npx playwright test --project=chromium   # e2e (потрібен запущений бекенд)
```

`npm run typecheck` — саме через `-p tsconfig.app.json`. Голий `tsc --noEmit`
у цьому репозиторії нічого не перевіряє (корінний `tsconfig.json` — лише
`references`). CI (`.github/workflows/ci.yml`) ганяє typecheck + lint + build
на Node 20 і 22; окремий workflow тримає бюджет головного бандла ≤ 200 KB gzip.

Pre-commit: husky + lint-staged (prettier + eslint), commitlint —
conventional commits.

## Структура

```
src/
├── components/
│   ├── layout/           AppLayout (мобільний таб-бар)
│   ├── public/           PublicHeader / PublicFooter / PublicLayout
│   ├── seo/              мета-теги, JSON-LD
│   ├── ui/               shadcn/ui примітиви
│   ├── ProtectedRoute.tsx  авторизація + гейт другого фактора
│   ├── MfaChallenge.tsx    екран TOTP-коду після входу
│   ├── TwoFactorDialog.tsx enroll/disable TOTP
│   └── ErrorBoundary, CookieConsent, PullToRefresh, …
├── contexts/AuthContext.tsx
├── hooks/                26 хуків: useDeals, useMessages, useChats, useCart,
│                         useProducts, useStripe, usePaypal, useAdyen, useMfa,
│                         useCurrency, usePremium, useLiveKit, useStreams, …
├── i18n/                 uk (основна) / en / de + LocaleProvider
├── integrations/supabase/ client.ts, types.ts
├── lib/                  native.ts (Capacitor haptics/share), money.ts,
│                         observability.ts (Sentry+PostHog), utils.ts
├── pages/
│   ├── public/           14 публічних сторінок
│   └── app/              31 сторінка застосунку
└── App.tsx               48 маршрутів

supabase/
├── migrations/           39 SQL-міграцій — повна схема + RLS
└── functions/            23 edge-функції (Deno) + _shared/

ios/App/                  Capacitor iOS-проєкт
tests/e2e/                Playwright-сьюти (chromium + iphone-webkit)
scripts/                  сиди, генератор sitemap, релізні скрипти, rls-regression
docs/                     IOS_BUILD, APPSTORE_LISTING, ROADMAP, SECURE_KYC_STORAGE
Dockerfile, nginx/, caddy/  self-hosted деплой (не використовується)
```

## Supabase

Міграції застосовуються по порядку (`001_…` → `039_…`). Локально:

```bash
supabase start                 # потрібен Docker
supabase db reset              # прогнати всі міграції
node scripts/seed-local.mjs    # демо-дані
```

На проді пряме підключення до БД — IPv6-only, тому міграції заливаються через
Supabase Management API (SQL over HTTP), див. «Операційні нотатки» в
`KNOWN_ISSUES.md`.

Деплой функцій і секретів:

```bash
supabase functions deploy <name>            # усі функції — з verify_jwt=true
supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=...
supabase secrets set LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=... LIVEKIT_WS_URL=...
supabase secrets set RESEND_API_KEY=...
```

## Змінні оточення

Повний перелік із коментарями — у [`.env.example`](.env.example). Мінімум для
локального запуску:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Клієнт робить fail-fast без цих двох (`src/integrations/supabase/client.ts`) —
збірка без env свідомо не має мовчки ходити в прод. Решта `VITE_*`
(Stripe-ціни, Sentry, PostHog) опційні: відповідні фічі деградують, а не падають.

## Безпека

- RLS увімкнено на всіх таблицях; сервісні SECURITY DEFINER RPC відкликані
  в анонімних і авторизованих ролей (міграція 036).
- Привілейовані колонки `profiles`/`deals` захищені тригерами (037);
  роль `admin` не можна самопризначити.
- Ордери та транзакції пише виключно Stripe-вебхук під service_role.
- 2FA — TOTP через Supabase Auth MFA. Клієнт не пускає aal1-сесію в `/app`,
  але на рівні БД `aal` **не** енфорситься — див. `KNOWN_ISSUES.md`.
- Регресія RLS: `node scripts/rls-regression.mjs`.

## Ліцензія

© 2026 BridoConnect · Luftarbeiter / Oleksii Kusov, Deutschland
