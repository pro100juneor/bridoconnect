# BridoConnect — design rules

Невиконання = баг. Це жорсткий контракт, не «keine Ideen».

Бренд: warm · trust · human · не-корпоративний · не-stripe-ish · не-глянцевий.
Аудиторія: люди в кризі + донори. Дизайн не повинен виглядати багатим або дешевим.

## 1. Заборонено

| ❌                                                                             | ✅                                                                       |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `rounded-lg` на картках/попапах                                                | `rounded-2xl` (16px) або `rounded-[20px]`                                |
| `shadow-sm` плоска тінь                                                        | stacked: `shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)]` |
| симетричні grid 50/50                                                          | asymmetric 2/3 + 1/3 або 3/5 + 2/5                                       |
| Lucide stroke-width < 1.5                                                      | `strokeWidth={1.75}` мінімум на іконках > 20px                           |
| > 2 акцентних кольорів на екран                                                | один primary + один accent + всі інші — нейтральні                       |
| inline emoji як ікони у production UI                                          | SVG / Lucide. Emoji — лише у user-generated content                      |
| `<div className="...">` без семантики коли є `<section>`, `<article>`, `<nav>` | семантичний тег                                                          |
| прапор 🇷🇺 будь-де                                                              | 🏳️ якщо нейтральний прапор потрібен                                      |

## 2. Обов'язково

### Геометрія

- Кожен **інтерактивний** елемент має мінімум 44×44 (Apple HIG)
- Картки мають **inset-highlight** зверху: `before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8`
- Hero на кожному екрані: serif або oversized sans-serif (≥36px) + `animate-fade-in`
- Whitespace знизу heroe'а: мінімум 120px

### Анімація

- Перехід між роутами — через `<PageTransition>` (вже є, `framer-motion AnimatePresence`)
- Кнопки: `hover:-translate-y-px transition-transform duration-150`
- Cards: `hover:shadow-[...] transition-shadow duration-200`
- Будь-який toggle/check: `framer-motion layoutId` (smooth morph)
- Loading states: skeleton, НЕ spinner. Spinner лише для < 500ms операцій.
- Spring physics: `cubic-bezier(0.34, 1.56, 0.64, 1)` — iOS-style overshoot
- Reduced-motion: всі `motion.*` мають `prefers-reduced-motion` fallback

### Стани

- Кожен list має empty-state з SVG-ілюстрацією (НЕ просто текстом)
- Кожен error має recovery action — кнопка «Спробувати знову», не просто текст
- Кожен success state має confetti / scale-in / checkmark анімацію

### Типографіка

- Шрифт: системний San Francisco / Inter (вже в Tailwind)
- Heading: `tracking-tight` + `font-semibold` (не `font-bold` без причини)
- Body: `leading-relaxed` (1.625), не дефолтний `leading-normal`
- Заборонено `text-xs` для основного контенту — лише caption/meta

### Дотик

- `tap()` haptic на кожному критичному tap (donate, confirm, delete)
- `notify("success")` на завершення позитивних дій
- `notify("error")` на validation fails
- Helper в `@/lib/native.ts`, no-op на web — використовуй

## 3. Mobile-first checklist

Кожна нова сторінка має пройти:

- [ ] safe-area-inset зверху і знизу (вже в AppLayout)
- [ ] всі кнопки `min-h-[44px]`
- [ ] немає горизонтального скролу на 375×667 (iPhone SE)
- [ ] немає overflow на 393×852 (iPhone 15)
- [ ] PullToRefresh на списках що оновлюються
- [ ] Бекдроп-blur на sticky хедерах: `bg-background/85 backdrop-blur-md`

## 4. Анти-паттерни які я (Claude) люблю і це баг

Я постійно генерую один з цих → виправляй:

1. **Bootstrap-grid syndrome**: 4-колонковий grid карток одного розміру. Заборонено. Mix: 1 hero + 3 small, або 2 large + 4 small.
2. **Card-chrome overload**: border + bg-card + shadow + rounded — все одразу. Вибирай 2 з 4.
3. **Lucide-spam**: іконка біля кожного слова. Іконки лише для дії (button) або статусу (badge), не для декору.
4. **Symmetric mercy**: все вирівняне по центру. Asymmetric layouts викликають увагу.
5. **Safe colors**: всюди primary/secondary з shadcn defaults. Дозволені 1-2 несподівані кольори на акцент (warm gold, deep coral).

## 5. Як я перевіряю себе

Перед коммітом UI-зміни:

1. `grep -E "rounded-lg|shadow-sm" <changed files>` → 0 матчів
2. Відкрити сторінку в chrome-devtools MCP (коли активується наступна сесія)
3. Скрін на 393×852 → порівняти з `references/inspiration/` — чи виглядає так само пропрацьовано
4. Якщо ні — переробити, не комітити

## 6. Як я навчаюся новим патернам

`references/inspiration/*.png` — скріни додатків які ти цінуєш візуально.
Перед стартом UI-задачі я **обов'язково** читаю ці зображення і копіюю конкретні рішення:

- Тіні (точні значення)
- Відстані (padding, gap)
- Радіуси
- Типографічний ритм
- Мікро-анімації

Без `references/` я повертаюсь у defaults. З ними — у твій смак.

## 7. Заборонено робити «про запас»

- НЕ створюй варіантів компонента «на майбутнє»
- НЕ додавай props які не використовуються
- НЕ роби кнопку трьох розмірів якщо потрібен один
- НЕ роби «гнучку» систему для одноразового екрану
- Простота > розширюваність на ранньому проєкті
