import { test, expect } from "@playwright/test";

const SPONSOR_EMAIL = "sponsor1@brido.local";
const SPONSOR_PASSWORD = "password123";

test.describe("PayPal payment-method tab", () => {
  test("sponsor switches to PayPal tab — donate disabled when recipient not onboarded", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("login-email").fill(SPONSOR_EMAIL);
    await page.getByTestId("login-password").fill(SPONSOR_PASSWORD);
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/app", { timeout: 15_000 });

    const firstCard = page.getByTestId("deal-card").first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/app\/deal\//);

    // Pick €10, then switch to PayPal tab.
    await page.getByTestId("donate-amount-10").click();
    await page.getByTestId("pay-method-paypal").click();

    // Recipient in seed has paypal_status='none' → donate button must be disabled.
    const donateBtn = page.getByTestId("donate-submit");
    await expect(donateBtn).toBeDisabled();
  });

  test("switching back to Stripe re-enables donate (recipient onboarded)", async ({ page }) => {
    await page.goto("/auth");
    await page.getByTestId("login-email").fill(SPONSOR_EMAIL);
    await page.getByTestId("login-password").fill(SPONSOR_PASSWORD);
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/app", { timeout: 15_000 });

    const firstCard = page.getByTestId("deal-card").first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/app\/deal\//);

    await page.getByTestId("donate-amount-10").click();
    await page.getByTestId("pay-method-paypal").click();
    await page.getByTestId("pay-method-stripe").click();

    await expect(page.getByTestId("donate-submit")).toBeEnabled();
  });
});
