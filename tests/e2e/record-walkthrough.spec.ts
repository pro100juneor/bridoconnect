import { test } from "@playwright/test";

// Записываем video каждого шага user journey отдельно — каждый файл
// будет stitched в hero-story-ua.mp4 ровно когда о нём говорит voice.
// Видео сохраняется как test-results/walkthrough-{step}/*.webm,
// потом ffmpeg конвертирует в MP4.

test.use({
  viewport: { width: 430, height: 932 },
  video: { mode: "on", size: { width: 1280, height: 720 } }, // финал 720p
});

const SPONSOR_EMAIL = "sponsor1@brido.local";
const SPONSOR_PASSWORD = "password123";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  await page.getByTestId("login-email").fill(SPONSOR_EMAIL);
  await page.getByTestId("login-password").fill(SPONSOR_PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/app", { timeout: 15_000 });
}

// STEP 1: "Відкрий стрічку. Тут — реальні люди з фото" (≈5s)
// Показываем feed, медленный slow-scroll вниз чтобы видны были несколько cards.
test("step1-feed-scroll", async ({ page }) => {
  await login(page);
  await page.waitForSelector('[data-testid="deal-card"]', { timeout: 10_000 });
  await page.waitForTimeout(800);
  // Slow scroll до 4 секунд
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 80);
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(300);
});

// STEP 2: "Натискаєш на картку — відкривається історія" (≈9s — match audio seg-04)
test("step2-open-deal", async ({ page }) => {
  await login(page);
  const card = page.getByTestId("deal-card").first();
  await card.waitFor({ timeout: 10_000 });
  await page.waitForTimeout(1200);
  await card.hover();
  await page.waitForTimeout(800);
  await card.click();
  await page.waitForURL(/\/app\/deal\//, { timeout: 10_000 });
  await page.waitForSelector('[data-testid="donate-submit"]', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  // Slow scroll по deal page чтобы видна была история / прогресс / опис
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 80);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);
});

// STEP 3: "Натисни Підтримати. Введи суму. Готово." (≈10s — match audio segment)
// Расширенный dwell + cycle через разные amount buttons
test("step3-donate-flow", async ({ page }) => {
  await login(page);
  await page.getByTestId("deal-card").first().click();
  await page.waitForURL(/\/app\/deal\//, { timeout: 10_000 });
  // Scroll к donate section
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
  await page.waitForTimeout(1200);
  // Hover на €10
  await page.getByTestId("donate-amount-10").hover();
  await page.waitForTimeout(700);
  await page.getByTestId("donate-amount-10").click();
  await page.waitForTimeout(900);
  // Перепрыг на €25
  await page.getByTestId("donate-amount-25").hover();
  await page.waitForTimeout(700);
  await page.getByTestId("donate-amount-25").click();
  await page.waitForTimeout(900);
  // Перепрыг на €50
  await page.getByTestId("donate-amount-50").hover();
  await page.waitForTimeout(700);
  await page.getByTestId("donate-amount-50").click();
  await page.waitForTimeout(900);
  // Финал: hover Підтримати кнопку
  await page.getByTestId("donate-submit").hover();
  await page.waitForTimeout(2500);
});
