# BridoConnect — полный аудит (2026-09-30)

Метод: детерминированные гейты + 4 параллельных read-only аудита (безопасность, корректность/баги,
соц-логин, сборка/зависимости/инфра). Каждая находка верифицирована против кода. Ничего не менялось.

## Детерминированные гейты

- `tsc --noEmit` — **0 ошибок** (но см. HIGH-3: `strict:false` ослабляет этот гейт)
- `eslint --max-warnings=0` — **0 предупреждений**
- Юнит-тесты (vitest) — **21/21 pass**
- `npm audit` — **21 уязвимость: 1 critical, 10 high, 9 moderate, 1 low** (все dev/build-time, см. ниже)

---

## CRITICAL

### C-1. Гейт согласия 18+/Условия/роль — только на клиенте (обход согласия)

`src/components/ProtectedRoute.tsx:55-58` + `src/contexts/AuthContext.tsx:55-66` + `supabase/migrations/048_social_login_onboarding.sql`
Редирект на `/welcome` при `onboarding_completed_at IS NULL` выполняется исключительно в React.
Ни одна RLS-политика/триггер/RPC не требует `onboarding_completed_at`/`terms_accepted_at`/`age_confirmed`
перед чтением/записью данных. Новый соц-пользователь получает валидный JWT (роль по умолчанию `sponsor`)
и может напрямую через PostgREST/RPC создавать сделки/товары/сообщения, **не подтвердив 18+ и не приняв Условия**.
Это не эскалация прав (в admin не пройти), но обход юридически значимого согласия — критично для GmbH.

> Примечание: это результат недавней работы над соц-логином (моей).

---

## HIGH

### H-1. RLS `reviews_insert` — нет проверки участия в сделке → накрутка/обвал рейтинга любому

`supabase/migrations/002_verification_reviews.sql:31`
Политика проверяет только `auth.uid() = reviewer_id`; не проверяет, что автор — участник `deal_id`,
что `reviewee_id` — контрагент сделки, что `role` соответствует, и что сделка завершена. `deals` мир-читаемы.
Эксплойт: двумя фейк-аккаунтами вставить по отзыву (`as_sponsor` + `as_recipient`) на один реальный `deal_id`
→ триггер пейринга (013) раскрывает их → `recalc_role_rating` (010) пишет фейковые баллы в рейтинг жертвы.
У `deals` есть BEFORE INSERT-guard (047), у `profiles` — `protect_profiles_columns` (037); у `reviews` — нет.

### H-2. `PublicProfile` — смешанные валюты в прогресс-баре + хардкод «€» на не-EUR цели

`src/pages/app/PublicProfile.tsx:259, 263`
`deal.raised` всегда в EUR, а `deal.amount` — в `deal.currency` (UAH/USD/PLN…). Экран делит EUR на сумму
в другой валюте и подставляет «€» к не-EUR цели:

- :259 `width: (deal.raised / deal.amount) * 100%`
- :263 `€{deal.raised} / €{deal.amount}`
  Для цели 40000 UAH и raised 100 EUR отрисуется «€100 / €40000» и бар ~0.25%. Это ровно та «фіктивна валюта»,
  которую убирал money-рефактор — пропущена на этом экране. Видно всем на каждом публичном профиле с не-EUR запросом.
  Фикс: `dealProgress(deal.amount, deal.currency, deal.raised)` как на остальных экранах.

### H-3. `tsconfig` `strict: false` — типобезопасность выключена по всему приложению

`tsconfig.app.json:14` (нет `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noUnusedLocals`)
null/undefined-баги, implicit-any и выход за границы массива **проходят `npm run typecheck`** (гейт CI).
Крупнейшая дыра корректности. Фикс: включить `strict: true` и постепенно закрыть ошибки.

### H-4. `.env.production` в git и не в `.gitignore`

Игнорятся только `.env`, `.env.local`, `.env.staging`, `.env.*.local`, `.env.prod-db-pass`.
Сейчас в файле только **публичные** ключи (anon-роль по RLS + публичные Google client id) — живых секретов нет.
Риск — прецедент: следующий реальный секрет (service-role/Stripe) уедет в коммит молча.
Фикс: добавить в `.gitignore` + `git rm --cached .env.production`.

### H-5 (defense-in-depth к C-1). `loadOnboarding` fail-open

`src/contexts/AuthContext.tsx:61-65` — при любой ошибке select'а `setNeedsOnboarding(false)` пускает в `/app`.
Для согласия 18+/Условия должно быть **fail-closed** (в отличие от aal-гейта).

---

## MEDIUM

- **M-1.** `reviews_select using(true)` (`002:30`) — раскрывает ещё не раскрытые (`revealed=false`) отзывы через PostgREST, ломая двойную слепоту рейтинга.
- **M-2.** Множество старых `SECURITY DEFINER`-функций без `set search_path` (`handle_new_user` 048:25-43; `release_escrow`, `apply_*_payment`, `recalc_role_rating`, `handle_verification_approved` и др.). Эксплуатируемость на текущем Supabase ограничена, фикс тривиален (`set search_path = public`). Новые миграции уже так делают — старые отстали.
- **M-3.** MFA (aal2) — только клиентский гейт и fail-open (`ProtectedRoute.tsx:35-41`); на уровне БД не энфорсится (само-документировано в KNOWN_ISSUES). Второй фактор обходится.
- **M-4.** `Profile` CryptoCard (`386-411`): кнопка сохранения всегда инвертирует `crypto_enabled`. Путь «включить → ввести адрес → Save» сохраняет адрес, но одновременно выключает крипто-выплаты. Получатель **не может** иметь крипту включённой с сохранённым адресом через UI.
- **M-5.** `useMessages.ts:16-24` — начальный fetch без `alive`/unmount-guard (в `useDirectMessages` он есть). При смене `dealId` поздний ответ может перезаписать сообщения нового чата + setState после unmount.
- **M-6.** Guard нативного Google (`socialAuth.ts:94`) проверяет только `VITE_GOOGLE_IOS_CLIENT_ID`; при пустом `VITE_GOOGLE_WEB_CLIENT_ID` (= `iOSServerClientId`) `signInWithIdToken` упадёт по audience (не краш, ловится, но тихий мисконфиг).
- **M-7.** CI (`.github/workflows/ci.yml`) без шага `npm audit` и без e2e-гейта (Playwright не в CI). nginx CSP содержит `script-src 'unsafe-inline'` (остальные заголовки — HSTS/XFO/frame-ancestors/COOP/nosniff — в порядке).

---

## LOW

- **L-1.** Утечка внутренних текстов ошибок клиенту в edge-функциях (`release-escrow:255`, `create-checkout:623`, `refund-deal:323`, `create-wise-payout:218`, `create-stream-token:134`, `stripe-webhook:123`). Лучше generic-сообщение + серверный лог.
- **L-2.** Аватар: `useProfile.ts:83-86`, `EditProfile.tsx:57-61` — upsert по фикс-пути без cache-buster → после ре-аплоада браузер отдаёт старое изображение; `ext` может быть `undefined` → `avatar.undefined`. (В `useShopProfile.uploadLogo` cache-buster есть.)
- **L-3.** `Search.tsx:41-56` — дебаунс без guard'а порядка ответов; поздний старый ответ может перезаписать `results`.
- **L-4.** `DealHistory.tsx:57-59` — «Надано» суммирует цель `amount` всех завершённых сделок (в т.ч. где юзер получатель) и цель вместо `raised` — смешивает дано/получено и цель/факт.
- **L-5.** i18n: ~64 ключа `t("key","fallback")` отсутствуют во всех словарях → en/de видят украинский fallback. Сырых точечных ключей не рендерится; сами словари uk/en/de консистентны между собой.
- **L-6.** `useProfile.ts:48` использует `.single()` вместо `.maybeSingle()` — если строки профиля ещё нет, `profile` молча остаётся null.
- **L-7.** `handle_new_user` помечает онбординг по `terms_accepted='true'` без учёта `age_confirmed` (из текущего Register недостижимо — он шлёт оба).
- **L-8.** `randomNonce` (`socialAuth.ts:72`) charset длиной 65 → лёгкий modulo-bias (на энтропию 32-символьного nonce влияние ничтожно).
- **L-9.** Dockerfile без `USER` (nginx master под root), `package.json` без `engines`, eslint `no-unused-vars` off (смягчено `--max-warnings=0` для `any`/exhaustive-deps).

---

## npm audit — полная расшифровка (все high/critical — dev/build-time)

Проект — статический фронт-бандл; ни один пакет ниже не исполняется в прод-nginx или в браузере пользователя.
`npm audit fix` (без `--force`) чинит 10 из 11 без ломки; только **vite 5→8** — это semver-major (`--force`).

| Пакет                 | Severity | Тип            | Цепочка                                                                                                |
| --------------------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| tar@7.5.16            | CRITICAL | dev            | @capacitor/cli → tar (5 advisories, DoS/crash при сборке iOS)                                          |
| @xmldom/xmldom@0.9.10 | HIGH     | dev            | @capacitor/cli → plist → xmldom (XML-инъекции, ReDoS)                                                  |
| vite@5.4.21           | HIGH     | **direct dev** | dev-сервер (path traversal, fs.deny bypass) — фикс `--force` → vite 8 (BREAKING)                       |
| postcss@8.5.9         | HIGH     | dev            | direct + autoprefixer/tailwind (XSS в stringify, чтение .map)                                          |
| ws@8.20.0             | HIGH     | transitive     | supabase-js→realtime-js→ws и jsdom→ws (в браузере realtime юзает native WebSocket; ws только в тестах) |
| nanoid@3.3.11         | HIGH     | dev            | postcss                                                                                                |
| js-yaml@4.2.0         | HIGH     | dev            | commitlint                                                                                             |
| form-data@4.0.5       | HIGH     | dev/test       | jsdom                                                                                                  |
| fast-uri@3.1.2        | HIGH     | dev            | commitlint→ajv                                                                                         |
| browserslist@4.28.2   | HIGH     | build/dev      | autoprefixer/babel                                                                                     |
| brace-expansion@5.0.6 | HIGH     | dev            | eslint→minimatch                                                                                       |

---

## Проверено и признано надёжным (без действий)

- **Платежи/вебхуки:** подписи всех процессоров fail-closed (Stripe constructEventAsync; PayPal verify-API; Adyen HMAC+timingSafeEqual; dLocal HMAC+timingSafeEqual; BTCPay HMAC+timingSafeEqual). Суммы checkout берутся из БД, валюта по whitelist, сток резервируется атомарно.
- **RLS/привилегии:** service-RPC (`apply_*`, `release_escrow`, `increment_*`, decrement_stock, rate-limit) revoked от public/anon/authenticated (036). Эскалация до admin закрыта (037/048). `protect_profiles_columns`/`protect_deals_columns`/`enforce_deals_insert_defaults`.
- **Санкции:** sanctions-screen fail-closed, ограничен self (кроме admin).
- **PII:** платёжные реквизиты/крипто-адреса/маскированные поля вынесены в закрытые таблицы (035/038). В публичном чтении профиля утечек нет.
- **Клиент:** нет `dangerouslySetInnerHTML`/`innerHTML`; service_role-ключа в бандле нет (только anon); редиректы только по `url` от доверенных edge-функций; observability скрабит token/password/secret из URL.
- **Соц-логин:** nonce Apple корректен (хэш→плагину, raw→Supabase; сверено с плагином 8.5.10); guard от краша нативного Google корректен; функции не бросают; RPC `complete_social_onboarding` (валидация роли sponsor/recipient, идемпотентность, auth-guard, search_path, revoke/grant); бэкфилл безопасен; entitlement и reversed-client-id корректны.
- **Деньги:** `money.ts` (toEur/fromEur/formatMoney), `useCurrency.dealProgress`, Admin `formatMinor(amount*100)` — математика верна (сверено с тестами).
- **Инфра:** vite `sourcemap:false` в проде; caddy auto-TLS; playwright бьёт в локальный Supabase; backup-prod отключён (`if:false`), секреты из repo secrets.

---

## Приоритет исправлений (рекомендация)

1. **C-1** — серверный энфорс согласия (RLS/триггер на запись, требующий `onboarding_completed_at`; либо не выдавать рабочую роль до онбординга) + **H-5** fail-closed.
2. **H-1** — guard на `reviews_insert` (участник сделки + корректный reviewee/role + завершённость) + **M-1** закрыть чтение нераскрытых отзывов.
3. **H-2** — `PublicProfile` перевести на `dealProgress` (быстрый однострочный фикс, но виден всем).
4. **H-3 / H-4** — `strict: true` (постепенно) и убрать `.env.production` из git.
5. **M-2** — `set search_path` на старые `SECURITY DEFINER`.
6. Прочее M/L — по мере.
