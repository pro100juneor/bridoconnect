import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

/**
 * Куда должен смотреть dev-сервер во время тестов.
 *
 * global-setup делает `supabase db reset` + seed-local.mjs в ЛОКАЛЬНЫЙ стек
 * (sponsor1@brido.local и остальные тестовые учётки создаются только там).
 * При этом в репозитории лежит `.env.local` с адресом staging — он нужен для
 * ручной разработки и у Vite приоритетнее `.env`. Без явного переопределения
 * браузер логинился в staging, где засеянных пользователей нет, и все
 * авторизованные сценарии падали на `waitForURL("**\/app")`.
 *
 * Переменные процесса перекрывают .env-файлы, поэтому прогон тестов ходит
 * в локальную базу, а ручной `npm run dev` продолжает работать со staging.
 */
function localSupabaseEnv(): Record<string, string> {
  try {
    const out = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
    const env: Record<string, string> = {};
    for (const line of out.split("\n")) {
      const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
      if (m) env[m[1]] = m[2];
    }
    if (!env.API_URL || !env.ANON_KEY) return {};
    return {
      VITE_SUPABASE_URL: env.API_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: env.ANON_KEY,
    };
  } catch {
    // Стек не поднят — пусть vite берёт свои .env; тесты, которым нужен
    // логин, упадут с понятной ошибкой вместо тихого похода в staging.
    return {};
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/global-setup.ts"],
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false, // donate/KYC mutate DB; serial run avoids cross-test interference
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "on-first-retry",
    video: "retain-on-failure",
    // Тесты написаны на украинских строках — это язык по умолчанию для
    // приложения. Без явной локали Playwright представляется как en-US,
    // detectLocale() выбирает EN, и проверки «Почати допомагати» падают.
    // Раньше это сходило с рук только потому, что EN-словарь был неполным
    // и экраны всё равно отдавали украинский fallback; после доведения
    // переводов иллюзия исчезла.
    locale: "uk-UA",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: [
        "**/iphone-audit.spec.ts",
        "**/button-explorer.spec.ts",
        "**/appstore-screenshots.spec.ts",
        // Не тест, а генератор: пишет прямо в public/images/walkthrough/,
        // то есть в закоммиченные маркетинговые картинки. В обычном прогоне он
        // молча затирал их кадрами с cookie-баннером, тостом «Вітаємо!» и
        // DEMO-данными сида. Запускать руками, когда картинки правда нужны:
        //   npx playwright test capture-walkthrough --project=chromium
        "**/capture-walkthrough.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    // App Store marketing screenshots at exact 6.9" size (440×956 @3x = 1320×2868).
    {
      name: "appstore-shots",
      testMatch: ["**/appstore-screenshots.spec.ts"],
      use: { ...devices["iPhone 14"] },
    },
    // Task 65 (audit): iPhone Safari (WebKit) crawl of every screen.
    {
      name: "iphone-webkit",
      testMatch: ["**/iphone-audit.spec.ts", "**/button-explorer.spec.ts"],
      use: { ...devices["iPhone 14"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 8080",
    url: "http://127.0.0.1:8080",
    // Переиспользовать чужой dev-сервер нельзя: он поднят с .env.local
    // (staging), а тестовые учётки живут в локальной базе.
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
    env: localSupabaseEnv(),
  },
});
