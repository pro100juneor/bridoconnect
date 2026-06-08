import { test, expect } from "@playwright/test";

test("landing renders hero + nav to register works", async ({ page }) => {
  await page.goto("/");

  // Brand mark always present
  await expect(page.locator("text=BridoConnect").first()).toBeVisible();

  // Primary CTA on the redesigned landing — UA copy: "Почати допомагати"
  // (also accept legacy RU/DE/EN strings for older builds).
  await page
    .getByRole("link", { name: /Почати допомагати|Помочь сейчас|Помочь|Helfen|Help/ })
    .first()
    .click();
  // Landing CTA → /register (changed from /auth in fix/home-vertical-scroll)
  await expect(page).toHaveURL(/\/(register|auth)/);
});
