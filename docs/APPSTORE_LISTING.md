# App Store листинг BridoConnect

> Черновик для App Store Connect → App Information / Version Information.
> Основной язык записи: украинский (uk). Локализации: en-US, de-DE.

## Название и подзаголовок (до 30 симв.)

| Локаль | Name         | Subtitle                      |
| ------ | ------------ | ----------------------------- |
| uk     | BridoConnect | Пряма допомога людям України  |
| en-US  | BridoConnect | Direct aid to Ukraine, P2P    |
| de-DE  | BridoConnect | Direkte Hilfe für die Ukraine |

## Промо-текст (до 170 симв., можно менять без ревью)

**uk:** Допомагай напряму: обери людину, підтримай ефіром, купівлею з магазину чи донатом. Кожен платіж захищено ескроу до підтвердження отримання.

## Описание (uk, основное)

BridoConnect — це P2P-платформа прямої гуманітарної допомоги. Спонсори з
усього світу допомагають конкретним людям в Україні — без посередників і
непрозорих фондів.

ЯК ЦЕ ПРАЦЮЄ
• Обирайте отримувача на його персональній сторінці — з фото, стіною та
списком бажань
• Дивіться прямі ефіри та підтримуйте донатом у реальному часі
• Купуйте потрібні речі в магазині — отримувач отримує саме їх
• Кошти захищені ескроу: списання лише після підтвердження отримання

МАГАЗИН
• До 5000 позицій, фото та відео кожного товару
• Ціни автоматично конвертуються у вашу валюту
• Фірмові вітрини продавців із контактами та месенджерами

ПРЯМІ ЕФІРИ
• Живе відео від отримувачів допомоги
• Чат і донати прямо під час ефіру

БЕЗПЕКА
• Верифікація обох сторін
• Платежі через Stripe (карти, Apple Pay)
• Персональні сторінки спонсорів закриті й відкриваються лише за їхньою
індивідуальною згодою на кожен запит

Оператор: Firma „Luftarbeiter“, Deutschland.
Підтримка: support@brido.de · Політика: brido.de/datenschutz

## Keywords (до 100 симв., uk)

допомога,україна,донат,гуманітарна,благодійність,ефір,спонсор,волонтер,escrow,подарунок

## URLs

- Support URL: https://bridoconnect.vercel.app/support (позже: https://brido.de/support)
- Marketing URL: https://bridoconnect.vercel.app
- Privacy Policy URL: https://bridoconnect.vercel.app/datenschutz

## Категории

- Primary: Social Networking (соцвзаимодействие спонсор↔получатель)
- Secondary: Shopping

## Age Rating (анкета)

Всё «No», кроме: Unrestricted Web Access — No (веб-вью нет). Итог: 4+.
ВАЖНО: в приложении есть пользовательский контент (стены, эфиры, чат) →
вопросы про UGC отвечать Yes (профили, обмен сообщениями). Итог скорее 12+/13+.

## App Privacy (nutrition label)

Собираем и связываем с пользователем:

- Contact Info: Email (аккаунт)
- User Content: фото/видео (товары, стены), сообщения (чат)
- Identifiers: User ID
- Financial Info: платёжная информация обрабатывается Stripe (не хранится у нас)
  Не используем данные для трекинга (No tracking) — ATT не нужен.

## Review Notes (для ревьюера, en)

Demo account: buyer@brido.local / password123 (sponsor role),
seller@brido.local / password123 (recipient role).
Payments run on Stripe test mode in this build; use card 4242 4242 4242 4242.
Donations are peer-to-peer physical goods & direct aid (not digital content),
processed via Stripe as permitted by guideline 3.2.1(vii) / 5.1.1.
Live streams use WebRTC (LiveKit).

## Скриншоты (обязателен размер 6.9" — 1320×2868 или 6.5"/6.7")

План (сним из симулятора iPhone 17 Pro Max):

1. Лента с промо-каруселью (после логина)
2. Магазин (каталог)
3. Карточка товара с фото
4. Прямой эфир (viewer с чатом)
5. Персональная страница получателя (стена + wishlist)
6. Экран входа (бренд)
