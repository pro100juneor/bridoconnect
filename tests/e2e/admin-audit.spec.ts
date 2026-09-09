import { test } from "@playwright/test";
test("admin audit as oleksii", async ({ page }) => {
  await page.goto("/auth");
  await page.fill('input[type="email"]', "oleksii@brido.local");
  await page.fill('input[type="password"]', "Oleksii");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/app/, { timeout: 15000 });
  try {
    const cookieBtn = page.getByRole("button", { name: /Тільки необхідні|Прийняти все/ }).first();
    if (await cookieBtn.count()) await cookieBtn.click({ timeout: 2000 });
  } catch {
    /* banner already dismissed */
  }
  await page.goto("/app/admin");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/admin-audit.png", fullPage: true });
  console.log("text:", (await page.locator("main,body").first().innerText()).slice(0, 800));
});
