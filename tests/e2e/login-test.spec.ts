import { test } from "@playwright/test";
test("oleksii login", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 300)));
  await page.goto("/auth");
  await page.fill('input[type="email"]', "oleksii@brido.local");
  await page.fill('input[type="password"]', "Oleksii");
  await page.locator('button[type="submit"]').click();
  try {
    await page.waitForURL(/\/app/, { timeout: 15000 });
    console.log("✅ дошёл до /app:", page.url());
  } catch {
    console.log("❌ ЗАВИС. url:", page.url());
  }
  await page.waitForTimeout(3000);
  console.log("console errors:", JSON.stringify(errors.slice(0, 5), null, 1));
  await page.screenshot({ path: "/tmp/oleksii-login.png" });
});
