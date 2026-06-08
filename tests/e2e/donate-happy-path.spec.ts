import { test, expect } from "@playwright/test";

// Seed personas live in scripts/seed-local.mjs (sponsor1@brido.local / password123).
const SPONSOR_EMAIL = "sponsor1@brido.local";
const SPONSOR_PASSWORD = "password123";

test.describe("Donate happy path", () => {
  test("sponsor logs in, opens deal, clicks Підтримати — create-checkout API called", async ({ page }) => {
    // 1. Intercept Stripe edge function and return a fake checkout URL —
    //    avoids needing real Stripe creds and external network.
    let receivedBody: { amount?: number; dealId?: string; type?: string } | null = null;
    await page.route(/\/functions\/v1\/create-checkout$/, async (route) => {
      try {
        receivedBody = JSON.parse(route.request().postData() || "{}");
      } catch {
        // ignore
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://stripe.test/mock-checkout-session" }),
      });
    });

    // 2. Login via /auth (data-testids added in this commit)
    await page.goto("/auth");
    await page.getByTestId("login-email").fill(SPONSOR_EMAIL);
    await page.getByTestId("login-password").fill(SPONSOR_PASSWORD);
    await page.getByTestId("login-submit").click();

    // 3. Land on /app
    await page.waitForURL("**/app", { timeout: 15_000 });

    // 4. Click the first deal card — navigates to /app/deal/:id
    const firstCard = page.getByTestId("deal-card").first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/app\/deal\//);

    // 5. Pick €10 + click Підтримати
    await page.getByTestId("donate-amount-10").click();

    // The Stripe-mock fulfill above will trigger a navigation to the fake URL —
    //    intercept the navigation so the test page doesn't actually go there.
    await page.route(/^https:\/\/stripe\.test/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>mock</body></html>" }),
    );

    await page.getByTestId("donate-submit").click();

    // 6. Wait for the API call to have been made — assert payload shape
    await expect.poll(() => receivedBody, { timeout: 10_000 }).not.toBeNull();
    expect(receivedBody?.amount).toBe(10);
    expect(receivedBody?.type).toBe("deal_payment");
    expect(typeof receivedBody?.dealId).toBe("string");
    expect(receivedBody?.dealId?.length).toBeGreaterThan(0);
  });
});
