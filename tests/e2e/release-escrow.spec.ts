import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

const SPONSOR_EMAIL = "sponsor1@brido.local";
const SPONSOR_PASSWORD = "password123";

function getServiceRole(): { url: string; key: string } {
  const out = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
  const env: Record<string, string> = {};
  for (const line of out.split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) env[m[1]] = m[2];
  }
  return { url: env.API_URL || "http://127.0.0.1:54321", key: env.SERVICE_ROLE_KEY || "" };
}

test.describe("Release escrow", () => {
  test("sponsor clicks 'Підтвердити отримання' → release-escrow API called", async ({ page }) => {
    // 1. Promote a deal to "funded by sponsor1" so the release button is enabled.
    const { url, key } = getServiceRole();
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data: sponsor } = await admin
      .from("profiles")
      .select("id")
      .eq("name", "Test Sponsor 1")
      .maybeSingle();
    if (!sponsor) throw new Error("sponsor1 profile missing — re-seed needed");
    const { data: deals } = await admin
      .from("deals")
      .select("id, amount, raised")
      .eq("status", "active")
      .limit(1);
    if (!deals?.length) throw new Error("no active deal to test");
    const dealId = deals[0].id;
    await admin
      .from("deals")
      .update({
        sponsor_id: sponsor.id,
        raised: deals[0].amount,
        stripe_payment_intent_id: "pi_test_mock",
        amount_cents: Math.round(deals[0].amount * 100),
        platform_fee_cents: Math.round(deals[0].amount * 5),
      })
      .eq("id", dealId);

    // 2. Mock the release-escrow edge fn.
    let releaseBody: { dealId?: string } | null = null;
    await page.route(/\/functions\/v1\/release-escrow$/, async (route) => {
      try {
        releaseBody = JSON.parse(route.request().postData() || "{}");
      } catch {
        // ignore
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, transferId: "tr_test_mock" }),
      });
    });

    // 3. Login + navigate to the deal.
    await page.goto("/auth");
    await page.getByTestId("login-email").fill(SPONSOR_EMAIL);
    await page.getByTestId("login-password").fill(SPONSOR_PASSWORD);
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/app", { timeout: 15_000 });
    await page.goto(`/app/deal/${dealId}`);

    // 4. Click release.
    const btn = page.getByTestId("release-escrow");
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await expect(btn).toBeEnabled();
    await btn.click();

    // 5. Assert the edge fn was called with our dealId.
    await expect.poll(() => releaseBody, { timeout: 10_000 }).not.toBeNull();
    expect(releaseBody?.dealId).toBe(dealId);
  });
});
