import type { Locale } from "../locales";

export type Dictionary = Record<string, string>;

/**
 * Словники збираються автоматично з усіх JSON у цій теці.
 *
 * Конвенція імен: `<locale>.json` — ядро, `<locale>.<shard>.json` — окремий
 * шматок (екран/група екранів). Завдяки import.meta.glob новий шард
 * підхоплюється без правок цього файлу — кілька людей можуть додавати
 * переклади паралельно, не конфліктуючи в одному індексі.
 */
const modules = import.meta.glob<{ default: Dictionary }>("./*.json", { eager: true });

function build(locale: Locale): Dictionary {
  const merged: Dictionary = {};
  for (const [path, mod] of Object.entries(modules)) {
    // "./uk.feed.json" → ["uk", "feed"]
    const parts = path.replace(/^\.\//, "").replace(/\.json$/, "").split(".");
    if (parts[0] !== locale) continue;
    Object.assign(merged, mod.default);
  }
  return merged;
}

export const DICTS: Record<Locale, Dictionary> = {
  uk: build("uk"),
  en: build("en"),
  de: build("de"),
};
