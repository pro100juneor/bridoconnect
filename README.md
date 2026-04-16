# BridoConnect 🇺🇦

> P2P гуманітарна платформа — допомога від людини людині без посередників.

**Live:** [bridoconnect.vercel.app](https://bridoconnect.vercel.app)

## Технологічний стек

| Категорія | Технологія |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Auth | Supabase Auth (email + Google OAuth) |
| База даних | Supabase PostgreSQL + RLS |
| Realtime | Supabase Realtime (чат, стрічка) |
| Storage | Supabase Storage (аватари, документи) |
| Платежі | Stripe Checkout + Webhooks |
| Підписка | Stripe Billing (Premium) |
| Live відео | LiveKit (WebRTC) |
| Deploy | Vercel |

## Структура проєкту

```
src/
├── components/
│   ├── layout/          # AppLayout (мобільний навбар)
│   ├── public/          # PublicHeader, PublicFooter, PublicLayout
│   ├── ui/              # shadcn/ui компоненти
│   ├── Logo.tsx
│   ├── ProtectedRoute.tsx
│   └── ReviewModal.tsx
├── contexts/
│   └── AuthContext.tsx  # useAuth hook
├── hooks/
│   ├── useProfile.ts    # профіль + uploadAvatar
│   ├── useDeals.ts      # CRUD для угод
│   ├── useMessages.ts   # realtime чат
│   ├── useReviews.ts    # система відгуків
│   ├── useTransactions.ts
│   ├── useVerification.ts
│   ├── useStripe.ts
│   ├── useLiveKit.ts
│   ├── usePremium.ts
│   └── use-toast.ts
├── integrations/supabase/
│   ├── client.ts
│   └── types.ts
├── pages/
│   ├── public/          # 8 публічних сторінок
│   ├── app/             # 21 app сторінок
│   ├── Auth.tsx
│   ├── Register.tsx
│   └── NotFound.tsx
└── App.tsx              # 33 маршрути
```

## Запуск локально

```bash
npm install
cp .env.example .env.local
# заповни змінні
npm run dev
```

## Supabase налаштування

1. Запусти міграції в Supabase Dashboard → SQL Editor:
```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_verification_reviews.sql
supabase/migrations/003_streams.sql
supabase/migrations/004_storage.sql
supabase/migrations/005_realtime.sql
```

2. Задеплой Edge Functions:
```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy create-stream-token
```

3. Додай секрети:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set LIVEKIT_API_KEY=...
supabase secrets set LIVEKIT_API_SECRET=...
supabase secrets set LIVEKIT_WS_URL=wss://...
```

## Vercel ENV Variables

```env
VITE_SUPABASE_URL=https://nqkwtebrgcnamevvngvh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_MONTHLY=price_...
VITE_STRIPE_PRICE_YEARLY=price_...
```

## Всі сторінки (33 маршрути)

### Публічні (без входу)
- `/` — Головна
- `/how-it-works` — Як це працює
- `/transparency` — Прозорість (статистика)
- `/live` — Прямі ефіри (preview)
- `/about` — Про нас
- `/faq` — Часті питання
- `/shop` — Публічний каталог
- `/verification` — Верифікація документів

### Auth
- `/auth` — Вхід (email + Google OAuth)
- `/register` — Реєстрація
- `/reset-password` — Відновлення пароля

### App (захищені, потрібен вхід)
- `/app` — Стрічка запитів
- `/app/live` — Прямі ефіри
- `/app/live/start` — Запуск ефіру
- `/app/live/:id` — Перегляд ефіру
- `/app/create-deal` — Нова угода (3 кроки)
- `/app/deal/:id` — Активна угода + оплата
- `/app/deals` — Історія угод
- `/app/dispute/:id` — Спір по угоді
- `/app/shop` — Магазин + Stripe
- `/app/shop/:id` — Деталі товару
- `/app/shop/seller/:id` — Профіль продавця
- `/app/chats` — Список чатів
- `/app/chat/:id` — Чат (realtime)
- `/app/notifications` — Сповіщення
- `/app/search` — Пошук людей
- `/app/profile` — Мій профіль
- `/app/profile/edit` — Редагувати профіль
- `/app/user/:id` — Публічний профіль + відгуки
- `/app/wallet` — Гаманець + транзакції
- `/app/wishlist` — Обрані виконавці
- `/app/settings` — Налаштування
- `/app/premium` — Premium підписка

## Ліцензія
© 2026 BridoConnect GmbH · Deutschland
