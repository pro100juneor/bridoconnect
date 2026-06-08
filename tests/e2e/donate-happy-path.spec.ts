import { test, expect } from "@playwright/test";

// Test users from scripts/seed-local.mjs
const SPONSOR_EMAIL = "sponsor1@brido.local";
const SPONSOR_PASSWORD = "password123";

test.describe("Donate happy path", () => {
  test("sponsor logs in, opens executor profile, donates €10 (mock-confirm)", async ({ page }) => {
    // 1. Login via /auth
    await page.goto("/auth");
    await page.getByTestId("login-email").fill(SPONSOR_EMAIL);
    await page.getByTestId("login-password").fill(SPONSOR_PASSWORD);
    await page.getByTestId("login-submit").click();

    // 2. Land on /app
    await page.waitForURL("**/app", { timeout: 10_000 });

    // 3. Click "Помочь" on the first executor card (data-testid avoids bottom-nav clash)
    const cardHelp = page.getByTestId("card-help").first();
    await expect(cardHelp).toBeVisible({ timeout: 10_000 });
    await cardHelp.click();

    // 4. Confirm we landed on a public profile (route /app/user/:id)
    await expect(page).toHaveURL(/\/app\/user\//);

    // 5. Click "Помочь" on profile -> opens CreateDealModal
    await page.getByTestId("profile-help").click();

    // 6. Modal: pick €10 (default selection). Click "Дальше"
    await page.getByRole("button", { name: /Дальше/i }).click();

    // 7. Skip message, "Дальше"
    await page.getByRole("button", { name: /Дальше/i }).click();

    // 8. Review: click "Оплатить"
    await page.getByRole("button", { name: /Оплатить/i }).click();

    // 9. Mock-confirm path -> success state
    await expect(page.getByText(/Спасибо!/i)).toBeVisible({ timeout: 10_000 });
  });
});
