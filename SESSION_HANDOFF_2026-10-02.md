# BridoConnect — HANDOFF / мастер-состояние (2026-10-02)

**Мастер-файл на случай падения/clear сессии. Здесь всё, чтобы продолжить с нуля.**
Ветка: **`feat/appstore-launch`** (запушена). Платежи НЕ запущены. Прод НЕ трогали.

## 0. Текущая задача

Непрерывная **ремедиация по глубокому аудиту** (директива владельца: выполнять до конца, без
остановок и подтверждений; ошибки чинить сам; блокеры вести списком D-001…D-006 и продолжать
остальное; промежуточное не выдавать за готовое; аудитору НЕ передавать до отмашки владельца).

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
```

Правила проекта — `CLAUDE.md`/`RULES_DETAILED.md`. Коммит/push/прод-миграции — по правилам (прод — D-001).
Паттерн работы: батч → локальный тест/гейт → коммит; intermediate не выдавать за готовое.
