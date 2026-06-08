# BridoConnect — brand moodboard

## Одним абзацом

Warm but serious. Як лист від друга який знає що говорить. Не як банк, не як благодійний фонд з тонкими шрифтами і сток-фото. Метафори: рукостискання, кухонний стіл, ясне небо, лист на папері, тихий вечір. НЕ-метафори: офісний skyline, стелаж з документами, stretched глянцеві ілюстрації, abstract geometric blobs, інфографіка з градієнтами, корпоративний синій.

## Reference apps (text-only, no screenshots yet)

Цей moodboard будували без скрінів. Коли додаси `references/inspiration/*.png` — я перечитаю і скорегую DESIGN.md. Поки що цільові естетики:

| Додаток | Що брати |
|---|---|
| **Linear** | Щільна типографіка, асиметричні layouts, тіні-чи-немає-тіней, monochrome accent з одним кольором, тонкі бордери |
| **Things 3** | Whitespace як головний матеріал, м'які тіні, нічого зайвого, контекст-меню замість модалок |
| **Granola** | Editorial hero на головному екрані, serif заголовки, leading-relaxed body, мало іконок |
| **Patreon mobile** | Donation flow як емоційний момент, не як платіжний термінал. Confetti не зайве. |
| **Are.na** | Cards-of-different-sizes (asymmetric), фото без overlay, типографіка несе вагу |
| **Headspace** | Onboarding як коротка історія, не як форма. Voice + анімація. |

## Що НЕ хочемо

- **Stripe-grade glossy**: занадто чисто, занадто маркетингово, занадто інженерно
- **Charity-org tropes**: водяні знаки логотипу, stock-фото "happy diverse people", прогрес-бари до 100%, big "DONATE NOW" CTA
- **Web3-aesthetic**: gradients, glass-morphism, neon, abstract 3D blobs
- **Material Design 3**: floating action buttons, ripples, надмірні elevations
- **iOS 18 default chrome**: системні bg-fill пресети без кастомізації

## Word-bank для копірайту

| ✅ | ❌ |
|---|---|
| «допомогти людині» | «зробити пожертву» |
| «обери людину» | «оберіть отримувача» |
| «прозоро» | «з повним фінансовим звітом» |
| «без посередників» | «direct peer-to-peer payment infrastructure» |
| «ти бачиш результат» | «отримайте підтвердження виконання» |

Тон: ти-форма, коротко, чесно. Не "we" — "ти / ми разом". Без жаргону.

## Кольори

Beyond design tokens (primary/accent/etc), допустимі акцентні кольори для рідкісних моментів:
- **Warm gold** `#c97f3e` — для рейтингу-зірок, premium-статусу
- **Deep coral** `#d94030` — для CTA "Допомогти" (вже використовується як accent)
- **Sage green** `#2d9e6a` — для success / verified-badge (вже success token)

Заборонено: pure black, pure white, electric purple, neon green.

## Hierarchy of trust

Order of trust signals на профілі / угоді (за пріоритетом):
1. **Ім'я + місто** — людина має ім'я
2. **Verified badge** — Lucide CheckCircle2, sage green, ніколи emoji ✓
3. **Real photos** — справжнє фото, не stock; якщо без фото — ініціали
4. **History** — кількість завершених угод + середній рейтинг
5. **Reviews** — текст відгуків, не зірочки
6. **Stats** — €X надано / отримано (один великий hero number)

## Animation discipline

- Будь-який рух має сенс: stagger підкреслює порядок, scale-in акцентує success, slide-up входить у фокус
- Без рандомних float / parallax / mouse-follow ефектів
- Spring physics `cubic-bezier(0.34, 1.56, 0.64, 1)` — iOS HIG. Не Material's `cubic-bezier(0.4, 0, 0.2, 1)`
- `prefers-reduced-motion` — пропускає весь рух, не "знижує" — або повне, або нічого

## Не змінюй коли отримаєш скріни

DESIGN.md правила (rounded-2xl, stacked shadow, inset-highlight, 44px, leading-relaxed, etc) — стійкі patterns з HIG / Apple-grade UI. Скріни референсів використовуй для:
- Конкретних spacings (наприклад "Linear-card padding = 20px")
- Точних тіней (наприклад "Things-card shadow = 0 4px 8px rgb(0/0/0/0.04)")
- Типографічних розмірів (наприклад "Granola hero = 56px")
- Мікроанімацій (наприклад "Headspace onboarding pulse = 1.2s ease-in-out infinite")

Не для перегляду правил.

## Як я (Claude) цей файл використовую

Перед UI-задачею:
1. Читаю DESIGN.md (правила)
2. Читаю цей файл (тон + estетика)
3. Якщо `references/inspiration/*.png` непорожнє — Read їх через мультимодальність
4. Виявляю конкретні patterns + застосовую
5. Перевіряю себе grep'ом на заборонені patterns перед коммітом
