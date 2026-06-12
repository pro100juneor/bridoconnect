import { test, expect } from "@playwright/test";

// Seeded recipient is verified + Connect "enabled". To test the onboarding
// UI we use a non-verified seed (exec3) whose connect_status is "none".
const RECIPIENT_EMAIL = "exec3@brido.local";
const RECIPIENT_PASSWORD = "password123";

test.describe("Connect onboarding", () => {
  test("recipient sees ConnectCard and triggers onboarding", async ({ page }) => {
    page.on("pageerror", (err) => console.log("[browser pageerror]", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[browser console.error]", msg.text());
    });

    // Mock the connect-status edge fn (avoids needing real Stripe creds).
    await page.route(/\/functions\/v1\/connect-status$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          has_account: false,
          status: "none",
          charges_enabled: false,
          payouts_enabled: false,
          requirements_due: [],
        }),
      })
    );

    let onboardBody: { country?: string } | null = null;
    await page.route(/\/functions\/v1\/connect-onboard$/, async (route) => {
      try {
        onboardBody = JSON.parse(route.request().postData() || "{}");
      } catch {
        // ignore
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://stripe.test/onboarding-link", accountId: "acct_mock" }),
      });
    });

    await page.route(/^https:\/\/stripe\.test/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html>mock onboarding</html>" })
    );

    await page.goto("/auth");
    await page.getByTestId("login-email").fill(RECIPIENT_EMAIL);
    await page.getByTestId("login-password").fill(RECIPIENT_PASSWORD);
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/app", { timeout: 15_000 });

    await page.goto("/app/profile");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/connect-onboard-debug.png", fullPage: true });

    const btn = page.getByTestId("connect-onboard");
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await expect(btn).toContainText(/Підключити|Stripe/i);
    await btn.click();

    await expect.poll(() => onboardBody, { timeout: 10_000 }).not.toBeNull();
  });
});
