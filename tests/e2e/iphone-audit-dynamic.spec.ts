import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";

// Покрытие dynamic + admin + 404 routes которых нет в iphone-audit.spec.ts.

const SPONSOR_EMAIL = "sponsor1@brido.local";
const SPONSOR_PASSWORD = "password123";

function admin() {
  const out = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
  const env: Record<string, string> = {};
  for (const line of out.split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) env[m[1]] = m[2];
  }
  return createClient(env.API_URL || "http://127.0.0.1:54321", env.SERVICE_ROLE_KEY || "", {
    auth: { persistSession: false },
  });
}

async function loginSponsor(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  await page.getByTestId("login-email").fill(SPONSOR_EMAIL);
  await page.getByTestId("login-password").fill(SPONSOR_PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/app", { timeout: 15_000 });
}

test.describe("Dynamic + missing routes audit", () => {
  let dealId = "";
  let recipientId = "";

  test.beforeAll(async () => {
    const sb = admin();
    const { data: deal } = await sb.from("deals").select("id, creator_id").limit(1).maybeSingle();
    if (!deal) throw new Error("no deal seeded");
    dealId = deal.id;
    recipientId = deal.creator_id;
  });

  test("/app/deal/:id renders without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await loginSponsor(page);
    await page.goto(`/app/deal/${dealId}`);
    await expect(page.getByText(/Угода|Підтримати/i).first()).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });

  test("/app/user/:id renders PublicProfile", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await loginSponsor(page);
    await page.goto(`/app/user/${recipientId}`);
    // PublicProfile shows Profile header + skeleton or content
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("/app/chat/:id renders Chat (or message-not-found state)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await loginSponsor(page);
    await page.goto(`/app/chat/${dealId}`);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("/app/dispute/:id renders Dispute form", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await loginSponsor(page);
    await page.goto(`/app/dispute/${dealId}`);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("/app/shop/:id renders ProductDetail (or empty state)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await loginSponsor(page);
    await page.goto("/app/shop/dummy-product-id");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("/app/shop/seller/:id renders seller view (or empty)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await loginSponsor(page);
    await page.goto(`/app/shop/seller/${recipientId}`);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("/app/live/:id renders StreamViewer", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await loginSponsor(page);
    await page.goto(`/app/live/${dealId}`);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("/some-nonexistent-route renders 404 NotFound", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/some-nonexistent-route-12345");
    await page.waitForLoadState("networkidle");
    // Should NOT redirect — should show NotFound
    expect(page.url()).toContain("some-nonexistent-route");
    expect(errors).toEqual([]);
  });

  test("/app/admin route exists (renders access-restricted or admin)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await loginSponsor(page);
    await page.goto("/app/admin");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
