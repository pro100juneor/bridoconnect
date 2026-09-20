# QA-сессия 20.09.2026 — полный прогон по страницам и ролям

> Хендовер-файл для продолжения после `/clear`. Здесь всё состояние: что сделано,
> что запущено, что найдено, как возобновить. Обновляется по ходу.
> Автор прогона: Claude Code (Opus 4.8), по запросу владельца.

## 0. Цель (задача владельца)

Запустить приложение, залогиниться, обойти **каждую страницу с обеих ролей**,
проверить доступы, **нажать каждую кнопку**, посмотреть отклик, **найти все
ошибки и заглушки**. Гипотеза владельца: «~4000 ошибок и заглушек».

## 1. Решения по методологии (согласованы с владельцем)

- **Способ прогона:** автоматический Playwright по WebKit (движок как в iOS
  WKWebView) для исчерпывающего обхода всех роутов × ролей × кнопок **+** короткий
  ручной iOS-смоук в симуляторе для iOS-специфики (safe-area, нативные alert,
  скрытый Apple-вход).
- **Бэкенд:** локальный Supabase (Docker), seed тестовых аккаунтов. Прод/стейджинг
  НЕ трогаем — клики создают реальные записи.

## 2. Окружение (как поднять заново)

```bash
open -a Docker                         # дождаться daemon: docker info
cd ~/bridoconnect
supabase start                         # локальный стек на 127.0.0.1:54321
# db reset + seed делает автоматически globalSetup Playwright,
# либо вручную:
supabase db reset
SUPABASE_SERVICE_ROLE=$(supabase status -o env | sed -nE 's/^SERVICE_ROLE_KEY="?([^"]*)"?$/\1/p') \
  node scripts/seed-local.mjs
```

Состояние на момент записи: Docker — UP, Supabase — UP (порт 54321, Studio 54323).
**Важно:** контейнер `supabase_edge_runtime` в локальном стеке остановлен →
**любой** вызов `/functions/v1/*` отвечает `503`. Это ожидаемо и объясняет все
503-и в находках (Stripe checkout, identity, promote, connect-status).

## 3. Тестовые аккаунты (seed-local.mjs, пароль `password123`)

| Email                | Роль      | Пароль      | Примечание                               |
| -------------------- | --------- | ----------- | ---------------------------------------- |
| sponsor1@brido.local | sponsor   | password123 | Berlin/DE → **немецкий UI**              |
| sponsor2@brido.local | sponsor   | password123 | München/DE                               |
| exec1@brido.local    | recipient | password123 | verified                                 |
| exec2@brido.local    | recipient | password123 | verified                                 |
| exec3@brido.local    | recipient | password123 | НЕ verified                              |
| seller@brido.local   | recipient | password123 | verified, «Test Seller», connect=enabled |
| oleksii@brido.local  | **admin** | **Oleksii** | админ                                    |

Seed создаёт также 3 сделки. Товаров/стримов/сторфронтов/чатов в сиде НЕТ →
соответствующие `:id/:slug`-роуты в прогоне пропускаются (нет данных).

## 4. Роли и доступы (из карты App.tsx)

- Роли: `sponsor | recipient | admin` (тип `UserRole`, `profiles.role`).
- Роут-гард один: `<ProtectedRoute>` на `/app/*` — только auth, **без** роль-гейтов
  на уровне роутера.
- `/app/admin` — гейт **внутри компонента** (`isAdmin = profile.role==="admin"`),
  не залинкован в нижней навигации; реальная защита — RLS в БД.
- 48 страниц: 14 public + 3 top-level (Auth/Register/NotFound) + 31 в `/app/*`.

## 5. Что создано/изменено в репозитории (этой сессией)

- **НОВЫЙ:** `tests/e2e/qa-crawl.spec.ts` — многоролевой краулер (гость/sponsor/
  recipient/admin): обход всех роутов, клик каждой кнопки/ссылки в изоляции,
  сбор pageerror/console/сети (4xx-5xx, кроме soft 401/403/404/406/409),
  эвристика непереведённых i18n-ключей, проверка гардов и админ-гейта,
  скриншоты каждой страницы. Пишет `test-results/qa-crawl/<role>.json`,
  `_all.json`, скриншоты в `test-results/qa-crawl/shots/<role>/`.
- **ИЗМЕНЁН:** `playwright.config.ts` — `qa-crawl.spec.ts` добавлен в проект
  `iphone-webkit` (testMatch) и исключён из `chromium` (testIgnore). 2 строки.

Прогон:

```bash
npx playwright test qa-crawl --project=iphone-webkit --reporter=line
```

(globalSetup сам сделает db reset + seed + поднимет dev-сервер на 8080 с локальным Supabase).

## 6. Статический скан (весь src/) — база

- 48 страниц. **TODO/FIXME: 0**, пустых `onClick`: 0, `href="#"`: 0,
  `any`/`@ts-ignore`: 0.
- «Заглушки»: из 71 совпадения — 41 это `placeholder=` у инпутов; комментарии
  со словами fake/mock/заглушка — это **пометки об уже удалённых фейках**.
- `console.*`: 2 (легитимны: ErrorBoundary, warning об отсутствии env).
- **`alert()`: 4** — РЕАЛЬНАЯ (мелкая) находка, см. §8.

## 7. Baseline (route-smoke, chromium, роль seller)

**40 passed / 1 failed.** Единственное падение — `/app/profile`: `503` от edge-функции
`connect-status` (нет edge-рантайма/Stripe-ключа локально) → известная «деградация
без ключей», не баг.

## 8. НАСТОЯЩИЕ находки (подтверждённые)

### F1 [low/UX] Нативный `alert()` вместо тоста — 4 места

Везде в приложении ошибки показываются через `toast()`, но в 4 ветках ошибок —
нативный `alert()` (на iOS выглядит инородно, блокирует webview):

- `src/pages/app/CreateProduct.tsx:171` (создание товара; тут же рядом toast —
  непоследовательно)
- `src/pages/app/Cart.tsx:32` (оплата корзины)
- `src/pages/app/StartStream.tsx:78` (не удалось подключить эфир)
- `src/pages/app/ProductDetail.tsx:77` (покупка товара)
  Фикс: заменить на `toast({variant:"destructive"})`.

### F2 [verify] 2 pageerror на `/app/live/start` (роль sponsor)

Uncaught-ошибки со ссылками на прерванные fetch (`/rest/v1/profiles?...`,
`/rest/v1/deals?...`) — вероятно, отклонённые промисы при размонтировании
страницы (LiveKit-редирект). **Нужно проверить вручную**: настоящая ли это
необработанная ошибка или navigation-abort шум. Скриншот:
`test-results/qa-crawl/shots/sponsor/app_live_start.png`.

## 9. ЛОЖНЫЕ срабатывания (НЕ баги — проверено)

- **dead-button (~44/роль):** это стейт-тогглы с реальными обработчиками —
  чипы категорий (`setForm(category)`), выбор способа оплаты (`setPayMethod`),
  суммы (`setAmount`), причины спора, язык, фильтры, refresh. Проверено по
  исходнику (CreateDeal/ActiveDeal/Dispute). Эвристика метит их «мёртвыми», т.к.
  клик не меняет URL/текст/DOM-длину заметно. **Реально мёртвых кнопок не найдено.**
- **Немецкий UI у sponsor1:** это НЕ баг — аккаунт привязан к Германии (Berlin/DE),
  `t()` корректно отдаёт немецкий словарь. i18n работает (uk/en/de заполнены).
- **Все `503 /functions/v1/*`:** локальный edge-рантайм выключен. На стейджинге/проде
  функции задеплоены. Не баг приложения.
- **WebSocket `realtime/v1/websocket` ошибки:** локальный realtime-шлюз. Не баг.
- **i18n raw-keys: 0** — непереведённых ключей не найдено.

## 10. Сводка находок краулера (severity после чистки эвристик)

| Роль      | Всего          | dead-button (низк./ложн.) | network (info/degraded) | pageerror (verify) |
| --------- | -------------- | ------------------------- | ----------------------- | ------------------ |
| anon      | 1              | 1                         | 0                       | 0                  |
| sponsor   | 50             | 44                        | 4                       | 2 (F2)             |
| recipient | 105            | 44                        | 61                      | 0                  |
| admin     | _(в процессе)_ |                           |                         |                    |

**Реальных высокоприоритетных багов приложения краулер НЕ выявил** (кроме F2 на
проверку). Гипотеза про «~4000 ошибок» рантаймом и статикой **не подтверждается** —
проект уже прошёл несколько аудитов (см. `KNOWN_ISSUES.md`, e2e 137 passed).

## 11. Осталось сделать (TODO для продолжения)

- [ ] Дождаться admin.json, добавить его цифры в §10 и `_all.json`.
- [ ] Проверить F2 вручную (live/start pageerror — баг или navigation-abort).
- [ ] iOS-смоук в симуляторе: `npm run build && npx cap sync ios`, открыть в Xcode,
      загрузить симулятор (доступны iOS 26.x), пройти ~6 ключевых экранов на
      safe-area/статусбар/нативные alert/скрытый Apple-вход. (ещё НЕ делалось)
- [ ] Просмотреть скриншоты `test-results/qa-crawl/shots/*` на визуальные дефекты
      (вёрстка, overflow, пустые состояния).
- [ ] Решить с владельцем: чинить ли F1 (alert→toast) сейчас.
- [ ] Известные архитектурные долги — в `KNOWN_ISSUES.md` (2FA aal2, presence RLS,
      push APNs, double-entry) — требуют решений владельца, не баги.

## 12. Как возобновить после /clear

1. Прочитать этот файл + `KNOWN_ISSUES.md` + `STATUS.md`.
2. Проверить окружение: `docker info`, `supabase status`.
3. Отчёты краулера: `test-results/qa-crawl/*.json`, скриншоты в `shots/`.
4. Перезапуск краулера: команда из §5.
5. Продолжить с TODO §11.
