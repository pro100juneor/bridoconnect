import { test } from "@playwright/test";

// App Store скриншоты: 440×956 @3x = 1320×2868 (iPhone 17 Pro Max, 6.9")
// Запуск: SKIP_DB_RESET=1 npx playwright test appstore-screenshots --project=webkit
const OUT = process.env.IPAD ? "/tmp/appstore-shots-ipad" : "/tmp/appstore-shots";

// IPAD=1 → 12.9" iPad Pro (1024×1366 @2x = 2048×2732), иначе iPhone 6.9"
const IPAD = !!process.env.IPAD;
test.use({
  viewport: IPAD ? { width: 1024, height: 1366 } : { width: 440, height: 956 },
  deviceScaleFactor: IPAD ? 2 : 3,
  isMobile: !IPAD,
  hasTouch: true,
});

test("capture App Store screenshots", async ({ page }) => {
  test.setTimeout(180_000);
  const shot = async (name: string) => {
    await page.waitForTimeout(1200); // дать анимациям устаканиться
    await page.screenshot({ path: `${OUT}/${name}.png` });
  };

  // 1. Экран входа (бренд)
  await page.goto("/auth");
  await page.waitForLoadState("networkidle");
  await shot("06-login");

  // Логин спонсором
  await page.fill('input[type="email"]', "buyer@brido.local");
  await page.fill('input[type="password"]', "password123");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/app/, { timeout: 20_000 });
  await page.waitForLoadState("networkidle");

  // Закрыть cookie-баннер (минимальный выбор) и дождаться исчезновения welcome-тоста
  const cookieBtn = page.getByRole("button", { name: /тільки необхідні/i });
  if (await cookieBtn.count()) await cookieBtn.click();
  await page.waitForTimeout(4500);

  // 2. Лента
  await shot("01-feed");

  // 3. Магазин
  await page.goto("/app/shop");
  await page.waitForLoadState("networkidle");
  await shot("02-shop");

  // 4. Карточка первого товара (карточки навигируют по клику, не через <a>)
  const buy = page.getByText(/товар/i).first();
  if (await buy.count()) {
    await buy.click();
    await page.waitForURL(/\/app\/shop\/[^/]+$/, { timeout: 10_000 }).catch(() => {});
    await page.waitForLoadState("networkidle");
    await shot("03-product");
  }

  // 5. Эфиры
  await page.goto("/app/live");
  await page.waitForLoadState("networkidle");
  await shot("04-live");

  // 6. Моя страница (публичная страница получателя — от продавца её видно через /u/, для спонсора возьмём профиль)
  await page.goto("/app/profile");
  await page.waitForLoadState("networkidle");
  await shot("05-profile");
});
