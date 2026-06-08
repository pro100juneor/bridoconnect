import { test, expect } from "@playwright/test";

test("landing renders hero + nav to auth works", async ({ page }) => {
  await page.goto("/");

  // Hero text from i18n (en/de/uk depending on browser locale; just check Brand is there)
  await expect(page.locator("text=BridoConnect").first()).toBeVisible();

  // The CTA on the landing should lead to /auth (multiple buttons; we pick the first link to /auth)
  await page
    .getByRole("button", { name: /Помочь сейчас|Помочь|Helfen|Help/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/auth/);
});
