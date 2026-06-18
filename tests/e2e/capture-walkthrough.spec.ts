import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Capture 3 walkthrough screenshots for hero video overlay.
// Use iPhone viewport (430×932) so the screenshots match real device.
test.use({ viewport: { width: 430, height: 932 } });

const SPONSOR_EMAIL = "sponsor1@brido.local";
const SPONSOR_PASSWORD = "password123";

test("walkthrough captures", async ({ page }) => {
  mkdirSync("public/images/walkthrough", { recursive: true });

  // 1. Login
  await page.goto("/auth");
  await page.getByTestId("login-email").fill(SPONSOR_EMAIL);
  await page.getByTestId("login-password").fill(SPONSOR_PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/app", { timeout: 15_000 });

  // 2. Feed — основная стрічка с deal cards
  await page.waitForSelector('[data-testid="deal-card"]', { timeout: 10_000 });
  await page.waitForTimeout(500); // let animations settle
  await page.screenshot({
    path: "public/images/walkthrough/01-feed.png",
    fullPage: false,
  });

  // 3. Deal page с кнопкой "Підтримати"
  await page.getByTestId("deal-card").first().click();
  await page.waitForURL(/\/app\/deal\//, { timeout: 10_000 });
  await page.waitForSelector('[data-testid="donate-submit"]', { timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "public/images/walkthrough/02-deal.png",
    fullPage: false,
  });

  // 4. Pick amount €25 — показывает что сумма выбрана и кнопка активна
  await page.getByTestId("donate-amount-25").click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "public/images/walkthrough/03-amount-selected.png",
    fullPage: false,
  });
});
