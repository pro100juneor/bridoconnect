# BridoConnect — полный аудит проекта (2026-11-07)

Ветка `feat/appstore-launch`. Стек: React 18 + TS + Tailwind + shadcn/ui + Supabase + Capacitor (iOS).

## Метод

Сквозной аудит всего приложения по 6 доменам (параллельные агенты, read-only), затем
независимая верификация каждой находки автором и исправление реальных дефектов порциями с
зелёным конвейером (`tsc` 0 · `eslint` 0 · тесты 28/28 · `build` ок). Ключевые фиксы проверены
на iOS-симуляторе против **staging** (`mlgyuonypcyseryrmcms`, миграции 042–060) и в браузере
(playwright против staging). Объём: 54 страницы, 56 роутов, 29 хуков, 42 компонента, 25 edge-функций,
60 миграций, 42 i18n-словаря (uk/en/de), ~24k LOC.

Классификация: **CRIT/HIGH/MED/LOW**. Денежный путь в edge-функциях (Deno) здесь не выполняется и не
деплоится → находки по нему идут под гейт **D-003** (нет Deno/Stripe-sandbox на машине); прод-миграции/
деплой — под **D-001**.

---

## 1. Исправлено (коммиты в ветке)

### Компоненты (`a12fc69`)

- **[HIGH] DealUpdates** — PDF-чек прогресс-апдейта рендерился как битый `<img>` и не открывался
  (хотя поле приёма принимает `application/pdf`). Ломало ключевую фичу «прозрачность расходов». Теперь
  ветвление как в ChatAttachment: изображение → превью-ссылка, иначе → ссылка-скачивание PDF.
- **[MED] ChatAttachment** — при ошибке подписи URL вложение навсегда зависало в скелетоне загрузки
  (не отличить от loading). Теперь состояния loading/ready/error + фолбэк «вкладення недоступне».
- **[LOW] CookieConsent** — чекбоксы analytics/error-tracking по умолчанию включены → «Зберегти вибір»
  без касания сохранял согласие без affirmative opt-in (невалидно по GDPR). Дефолт → `false`;
  «Прийняти все» ставит явно.
- **[LOW] ReviewModal** — у самописного оверлея не было закрытия по Escape; добавлено.

### Страницы / роутинг (`4740d09`)

- **[HIGH] Публичная страница `/u/:slug`** — единственные CTA («Підтримати», карточки вишлиста) вели в
  auth-gated `/app/*`; гостя (вся аудитория расшаренной ссылки) выбрасывало на `/auth`, а после входа —
  на `/app`, не возвращая к получателю. Конверсионный путь публичной страницы был тупиком. Теперь
  `ProtectedRoute` передаёт `from`, а `Auth` после входа возвращает пользователя туда (с guard против
  open-redirect). Чинит весь класс protected-роутов.
- **[MED] Notifications** — строки `gift_received/gift_shipped/gift_delivered`, `new_message`,
  `review_received` не несли `deal_id`, поэтому тап по ним ничего не делал (хотя выглядели кликабельными).
  Добавлена маршрутизация по типу (gift\_\* → `/app/gifts`, new_message → `/app/chats`, review_received →
  `/app/profile`). Также в TS-юнион `NotificationType` добавлены gift-типы (в БД они с мигр. 059).
- **[MED] Search** — рендер результата падал (TypeError) на профиле без имени (совпадение по city/bio,
  `name.split`). Защищено `(name || "?")`.

### Хуки / data-слой (`db30a56`)

- **[MED] useProfile** — профиль не очищался при смене/выходе юзера и без alive-guard → UI мог показывать
  имя/аватар/город прежнего пользователя (или медленный ответ A перезаписывал B). Очистка при `!user` +
  alive-guard.
- **[MED] useTransactions** — баланс кошелька считался только по последним 50 транзакциям (`.limit(50)`),
  т.е. при >50 транзакциях был неверным. Теперь баланс по всему леджеру; список — limit(50); + guard.
- **[MED] useChats** — N+1 фетч превью мог перезаписать разлогиненный/переключённый UI превью чатов
  прежнего юзера (чужие имена/аватары/последние сообщения). Терминальный `setChats` защищён per-run
  `isActive()`.
- **[LOW] AuthContext** — `loadOnboarding` перечитывался на каждый часовой TOKEN_REFRESHED (смена объекта
  `user`) и мог примениться после выхода. Эффект ключится на `user?.id` + alive-guard.

### i18n / PWA (`21b17fb`)

- **[LOW]** `cart.openProduct` и `recipientPage.photoAlt` использовались в коде, но отсутствовали во всех
  словарях (en/de видели украинский fallback на aria-label/alt). Добавлены в uk/en/de.
- **[HIGH→fixed] PWA-манифест** — `manifest.json` ссылался на `/icon-192.png` и `/icon-512.png`, которых
  не существовало (SPA отдавал index.html на 404 → warning «not a valid image», PWA не устанавливалась).
  Сгенерированы реальные 192×192 и 512×512 PNG из brand `favicon.svg`.

### Миграции / RLS (`32c500c`, миграция 060 — применена на staging)

- **[HIGH] merchant_update_fulfillment** — не было предусловия по текущему статусу: продавец мог перевести
  ЛЮБОЙ свой заказ сразу в `completed` (минуя `paid→shipped→completed`) и на неоплаченном заказе с
  `shipping_address_id` затем прочитать адрес получателя через `order_shipping_for_merchant` (её гейт
  пускает paid/shipped/completed). Теперь: accepted/shipped — только из `paid`; delivered — только из
  `shipped`; `delivered→completed` зеркалится только для подарков (`is_gift`); canceled — только из `paid`;
  строка берётся `FOR UPDATE`.
- **[LOW] reports_insert_own** — не форсировал `status='open'` (репортёр мог создать свой репорт сразу
  `reviewed/dismissed`). Добавлено `and status = 'open'`.
- **[LOW] protect_profiles/deals/streams_columns** — не SECURITY DEFINER, поэтому сквозная подчистка
  search_path в 049 их не затронула; `set search_path = public` для defense-in-depth.

### Вёрстка (`80eb0e0`, проверено на симуляторе)

- **[MED] ProductDetail / Cart** — фиксированные нижние action-бары (Купити/Додати в кошик/Написати,
  оформление корзины) были `fixed bottom-0` без z-index, а таб-навигация AppLayout — `fixed bottom-0 z-50`
  → навбар перекрывал кнопки оплаты (не нажать на телефоне). Бары подняты над навбаром
  (`bottom = 4rem + safe-area`, `z-40`) + нижний отступ контента. Подтверждено на симуляторе: бар и навбар
  видимы и кликабельны, без перекрытия.

---

## 2. Проверено и признано чистым (сильные негативы)

Эти области проверены адресно и дефектов не содержат — важно для доверия внешнего аудита.

- **Приватность адреса подарка (критический инвариант) — ДЕРЖИТСЯ на уровне SQL.** `shipping_addresses`
  RLS — только владелец (select/insert/update/delete); спонсор/покупатель таблицу не читает.
  `order_shipping_for_merchant` — SECURITY DEFINER + search_path, гейт `seller_id=auth.uid()` и
  `status in (paid,shipped,completed)`. Покупателю в `orders_select` виден лишь UUID адреса (мёртвый FK),
  не строки адреса. Единственная щель (неоплаченный статус) закрыта миграцией 060.
- **Ролевая целостность — ENFORCED.** `profiles.role` в защищённых колонках (`protect_profiles_columns`,
  BEFORE UPDATE, raise кроме service_role/admin); `handle_new_user`/`complete_social_onboarding` принимают
  только sponsor/recipient; merchant ставится исключительно `decide_merchant_application` (admin-gated);
  admin — вручную. Клиентского пути самоэскалации в merchant/admin нет.
- **RLS включён на всех 41 public-таблицах** (created == enabled). `sanctions_screening_log`,
  `edge_rate_limits` заперты на service_role.
- **Денежные колонки защищены.** deals (raised/amount/status/sponsor*id/escrow/payment refs) — guarded на
  UPDATE + safe-defaults на INSERT; streams (raised/goal/viewer_count/host_id) guarded; orders/order_items/
  promotions/product_reservations/currency_rates — только service_role-write. Все `apply*_/release*escrow/
  increment*_` RPC отозваны у anon/authenticated и несут status/idempotency-гварды.
- **Edge — auth/подписи вебхуков корректны.** Каждая функция валидирует JWT (`auth.getUser`); refund-deal/
  release-escrow требуют sponsor/admin; capture-paypal-order резолвит заказ по dealId на сервере и блокирует
  не-плательщика (защита от IDOR); подписи Stripe/PayPal/Adyen/dLocal/BTCPay проверяются fail-closed.
  Основная идемпотентность Stripe (dedup по event.id до денежных RPC, idempotencyKey на release/refund,
  reservation-TTL стока) — на месте. Fee/split 5% консистентен, валюты в нижнем регистре, Adyen заперт на EUR.
- **Gift-поток в edge чист.** Спонсор передаёт только `beneficiaryId`; сервер валидирует, что бенефициар —
  recipient, резолвит его адрес сам и кладёт в заказ только `id` адреса. Спонсор адрес не выбирает и не видит.
- **i18n-паритет чистый.** Объединённо uk=en=de=1223 ключа; 0 отсутствующих в любую сторону (после фикса
  2 ключей); 0 украинских утечек в en/de. Новые экраны перестройки (Gifts/BecomeMerchant/MerchantOrders/
  Admin/Picker) — весь пользовательский текст через `t()`.
- **iOS/секреты.** Info.plist: portrait-lock, все 4 privacy-строки, `ITSAppUsesNonExemptEncryption=false`,
  ATS по умолчанию (без оверрайда). Бандл `de.brido.connect`, версия 1.0(1). В `src/` нет хардкод-секретов
  (0 совпадений sk\_/AIza/service_role/PRIVATE KEY). `.gitignore` корректен. tsconfig `strict:true`, CI
  гейтит typecheck.
- **git-история `.env.production`** — файл был закоммичен и удалён, НО во всех исторических версиях содержал
  только `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` — публичные client-переменные (и так в
  бандле SPA). Серверных секретов (service_role/STRIPE_SECRET_KEY) в истории никогда не было → ротация не
  нужна, переписывание истории — опционально/косметика.

---

## 3. Открытые пункты — владельцу / под D-003 (НЕ исправлялись здесь)

Edge-функции (Deno) не выполняются и не деплоятся на этой машине → изменения в них нельзя верифицировать;
деплой — отдельное действие владельца. Класть непроверенные правки платёжного кода в аудит-архив как
«исправленное» было бы нечестно. Поэтому задокументировано:

- **[HIGH / edge] CORS: нет прод-домена `bridoconnect.com`.** Во всех платёжных/Connect-функциях
  `ALLOWED_ORIGINS` содержит только `bridoconnect.vercel.app` + capacitor/localhost (искл. send-email).
  Запрос браузера с `https://bridoconnect.com`/`www` → origin-mismatch → браузер блокирует ответ (checkout/
  refund/escrow/Connect ломаются с прод-домена). Fix: добавить прод-домен(ы) в allowlist всех функций
  (лучше централизовать в `_shared`). **Требует подтверждения владельцем канонического прод-домена + деплой.**
- **[HIGH / edge] Утечка сырых ошибок провайдеров.** refund-deal, create-checkout, create-paypal-order,
  create-adyen/dlocal/crypto, connect-\*, kyc-trigger и др. возвращают клиенту сырой текст ответа
  PayPal/Adyen/dLocal/BTCPay/Sumsub/Stripe (leak backend-состояния). Fix: логировать детально на сервере,
  клиенту — generic-код (паттерн уже есть в connect-status/capture-paypal-order/create-wise-payout). D-003.
- **[MED / edge] create-paypal-order** — нет гейтов `deal.status`/already-funded (в отличие от create-checkout/
  adyen/dlocal/crypto) → можно создать PayPal-ордер на завершённую/уже профинансированную сделку. Fix: зеркалить
  проверки из create-checkout. D-003.
- **[MED / edge] dLocal** — в `/payments` нет реального split/payout бенефициару (только информационное поле),
  а `release-escrow` не имеет dlocal-ветки → для dlocal-сделки деньги застревают на платформе. Fix: настоящий
  split/payout или явно выключить dLocal до верификации на sandbox. D-003.
- **[MED / edge] webhook-btcpay** — нет edge-идемпотентности и игнорируется флаг `isRedelivery`; при
  неидемпотентном `apply_crypto_payment` переигровка InvoiceSettled задвоит raised. Fix: подтвердить dedup в
  RPC или добавить уникальный маркер по invoice id. D-003.
- **[LOW / edge] Англоязычные `message` в UI.** Коды ошибок стабильны (`recipient_not_onboarded` и т.п.) —
  локализовать на клиенте по коду, а англ. `message` нейтрализовать. (На экране товара уже используется
  локализованный инлайн-варнинг — подтверждено на симуляторе; остаётся дочистить прочие.)
- **[LOW / edge] webhook-dlocal** — REFUNDED/CHARGEBACK insert без явной проверки идемпотентности (результат
  вставки не разбирается). Fix: обработать 23505 как у PAID-пиров. D-003.
- **[note / money-edge, пред-существующее]** dashboard-инициированный refund PI на уже-released escrow-сделке
  (charge.refunded) фиксирует возврат и флипает статус, но не реверсит отдельный transfer получателю (реверс
  делает только admin-путь refund-deal). Проверить под D-003.
- **[LOW / продуктовое] Profile — пункты меню не по роли.** «Моя публічна сторінка», «Активні угоди»,
  «Обрані виконавці», «Гаманець» показываются всем ролям, включая merchant/admin (не крашит — просто пустые/
  нерелевантные экраны). Какие пункты видит каждая роль — продуктовое решение (как и ролевые табы, оставленные
  «на ревью владельцу»); гейтить наугад рискованно. Рекомендуется ролевой проход владельцем.
- **[LOW / опц.] capacitor.config** — нет `allowNavigation` allowlist (cleartext только за dev-флагом). Опц.
  хардеринг.
- **[LOW / продуктовое] shipping address ownership** — нет DB-гарантии, что `orders.shipping_address_id`
  принадлежит бенефициару (практический риск минимален: orders пишет только service_role, id адреса —
  неугадываемый uuid). Опц. триггер-проверка.

---

## 4. Гейты

- **push** — по команде «запушити» (разрешение в settings есть).
- **D-001** — прод-миграции (042–060 на прод) и деплой ветки/edge: только по явному «да».
- **D-003** — edge/Stripe-sandbox: верификация и деплой правок платёжного пути (п. 3).
- **D-004** — юр (возвраты/Widerruf, MiCA, DSA).

## 5. Статус

Все исправимые/верифицируемые на этой машине дефекты закрыты и проверены (симулятор/браузер против staging,
конвейер зелёный). Миграции 042–060 на staging. Клиентские фиксы — в ветке (коммиты выше). Остаток —
edge/платёжный путь (D-003), прод-деплой (D-001), юр (D-004), ролевой проход меню (владелец).
