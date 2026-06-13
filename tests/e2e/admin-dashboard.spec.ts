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

test.describe("Admin dashboard", () => {
  test("non-admin sees 'access restricted' screen", async ({ page }) => {
    // Reset sponsor1 to non-admin in case a prior test left them promoted.
    const { url, key } = getServiceRole();
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data: sponsor } = await admin
      .from("profiles")
      .select("id")
      .eq("name", "Test Sponsor 1")
      .maybeSingle();
    if (sponsor) await admin.from("profiles").update({ role: "sponsor" }).eq("id", sponsor.id);

    await page.goto("/auth");
    await page.getByTestId("login-email").fill(SPONSOR_EMAIL);
    await page.getByTestId("login-password").fill(SPONSOR_PASSWORD);
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/app", { timeout: 15_000 });

    await page.goto("/app/admin");
    await expect(page.getByRole("heading", { name: /Доступ обмежено/i })).toBeVisible({ timeout: 10_000 });
  });

  test("admin sees Sanctions / Disputes / Refunds sections", async ({ page }) => {
    // Promote sponsor1 to admin for this test, restore at end.
    const { url, key } = getServiceRole();
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data: sponsor } = await admin
      .from("profiles")
      .select("id")
      .eq("name", "Test Sponsor 1")
      .maybeSingle();
    if (!sponsor) throw new Error("sponsor1 missing");
    await admin.from("profiles").update({ role: "admin" }).eq("id", sponsor.id);

    try {
      await page.goto("/auth");
      await page.getByTestId("login-email").fill(SPONSOR_EMAIL);
      await page.getByTestId("login-password").fill(SPONSOR_PASSWORD);
      await page.getByTestId("login-submit").click();
      await page.waitForURL("**/app", { timeout: 15_000 });

      await page.goto("/app/admin");
      await expect(page.getByText(/Sanctions Screening/i)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/Open Disputes/i)).toBeVisible();
      await expect(page.getByText(/Recent Refunds/i)).toBeVisible();
    } finally {
      await admin.from("profiles").update({ role: "sponsor" }).eq("id", sponsor.id);
    }
  });
});
