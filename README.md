# BridoConnect

P2P гуманітарна платформа — допомога від людини людині без посередників.

## Стек
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth, DB, Storage, Realtime, Edge Functions)
- Stripe (Payments, Subscriptions)
- LiveKit (Live Streams)
- Vercel (Deploy)

## Швидкий старт

```bash
npm install
npm run dev
```

## ENV змінні

Скопіюй `.env.example` в `.env.local`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=...
```

## Supabase налаштування

1. Запусти міграції з `supabase/migrations/`
2. Задеплой Edge Functions:
```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy create-stream-token
```

3. Додай секрети:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set LIVEKIT_API_KEY=...
supabase secrets set LIVEKIT_API_SECRET=...
supabase secrets set LIVEKIT_WS_URL=wss://...
```

## Vercel деплой

Додай у Vercel Environment Variables всі змінні з `.env.example`.

## Архітектура сторінок

### Публічні
- `/` — Головна
- `/how-it-works` — Як це працює
- `/transparency` — Прозорість
- `/live` — Ефіри (preview)
- `/about` — Про нас
- `/faq` — FAQ
- `/shop` — Каталог магазину
- `/verification` — Верифікація

### Авторизація
- `/auth` — Вхід
- `/register` — Реєстрація
- `/reset-password` — Відновлення пароля

### App (захищені)
- `/app` — Стрічка
- `/app/live` — Прямі ефіри
- `/app/live/start` — Запуск ефіру
- `/app/live/:id` — Перегляд ефіру
- `/app/create-deal` — Нова угода
- `/app/deal/:id` — Активна угода
- `/app/deals` — Історія угод
- `/app/dispute/:id` — Спір
- `/app/shop` — Магазин
- `/app/shop/:id` — Товар
- `/app/shop/seller/:id` — Продавець
- `/app/chats` — Чати
- `/app/chat/:id` — Чат
- `/app/notifications` — Сповіщення
- `/app/search` — Пошук
- `/app/profile` — Профіль
- `/app/profile/edit` — Редагування
- `/app/user/:id` — Публічний профіль
- `/app/wallet` — Гаманець
- `/app/wishlist` — Обрані
- `/app/settings` — Налаштування
- `/app/premium` — Premium
