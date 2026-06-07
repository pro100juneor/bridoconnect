# references/

Це папка-вхід для дизайн-смаку. Без неї Claude (я) генерую дефолтний bootstrap-grade UI.

## Структура

```
references/
  inspiration/        ← скріни додатків які тобі візуально подобаються
    linear-feed.png
    arc-tabs.png
    things-today.png
    granola-notes.png
    cron-week.png
  brand/
    moodboard.md      ← 1 абзац: настрій, метафори, що НЕ хочемо
    voice.md          ← як говорить продукт (warm/clinical/playful)
    palette.md        ← опційно — додаткові акцентні кольори поза design tokens
  figma-export/       ← опційно — якщо є Figma з токенами/компонентами
    tokens.json
    components.png
```

## Що сюди класти

### inspiration/

- **3-7 скріншотів** додатків з high-craft UI
- PNG/JPG, бажано native resolution (Retina)
- Назва файлу = `<app>-<screen>.png` (наприклад `linear-issue.png`)
- НЕ цілий design system — лише ті екрани які найбільше подобаються

Рекомендовані для warm/trust/human бренду:

- Linear (feeds, issue detail)
- Arc Browser (tabs, library)
- Things 3 (Today view)
- Granola (notes detail)
- Mubi (film grid)
- Are.na (cards)
- Cron / Notion Calendar
- Patreon mobile (donation flows)
- Headspace (onboarding)

### brand/moodboard.md

Один абзац у вільній формі. Приклад:

> «Warm but serious. Як лист від друга який знає що говорить.
> Не як банк. Не як благодійний фонд з тонкими шрифтами і
> сток-фото. Метафори: рукостискання, кухонний стіл, ясне небо.
> НЕ-метафори: офісний skyline, стелаж з документами,
> stretched глянцеві ілюстрації, abstract geometric blob shapes.»

## Як я це використовую

Перед UI-задачею я обов'язково:

1. `Read` усі скріни з `inspiration/` через мультимодальність
2. Прочитаю `brand/moodboard.md`
3. Витягну конкретні patterns: тіні, відстані, типографіку, кольори, мікро-анімації
4. Застосую їх до нової сторінки

Без цих файлів — defaults. Не пропускай цю папку.
