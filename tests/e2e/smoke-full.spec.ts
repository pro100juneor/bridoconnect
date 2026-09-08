import { test, expect, type ConsoleMessage, type Request, type Response } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Temporary smoke test — walks all major screens as sponsor1, captures
// screenshots, console errors, and network 4xx/5xx per page.
// Real donate is mocked (create-checkout intercepted).

const SPONSOR_EMAIL = "sponsor1@brido.local";
const SPONSOR_PASSWORD = "password123";
const OUT_DIR = "/tmp/smoke";
mkdirSync(OUT_DIR, { recursive: true });

interface PageReport {
  route: string;
  label: string;
  status: "ok" | "broken" | "not-loaded";
  navError?: string;
  consoleErrors: string[];
  networkErrors: { url: string; status: number; method: string }[];
  screenshot: string;
}

// The routes we want to hit. Dynamic :id routes are filled in after
// probing DB for a real deal id / chat id where possible.
const STATIC_ROUTES: { path: string; label: string }[] = [
  { path: "/auth", label: "auth" },
  { path: "/app", label: "feed" },
  { path: "/app/wallet", label: "wallet" },
  { path: "/app/profile", label: "profile" },
  { path: "/app/profile/edit", label: "edit-profile" },
  { path: "/app/chats", label: "chat-list" },
  { path: "/app/notifications", label: "notifications" },
  { path: "/app/deals", label: "deal-history" },
  { path: "/app/wishlist", label: "wishlist" },
  { path: "/app/shop", label: "shop" },
  { path: "/app/search", label: "search" },
  { path: "/app/settings", label: "settings" },
  { path: "/app/premium", label: "premium" },
  { path: "/app/admin", label: "admin" },
  { path: "/app/live", label: "live-streams" },
  { path: "/app/create-deal", label: "create-deal" },
  { path: "/verification", label: "kyc-verification" },
];

test.describe("Full smoke walk", () => {
  test("sponsor visits every major screen", async ({ page, context }) => {
    test.setTimeout(240_000);
    const reports: PageReport[] = [];

    // Mock the create-checkout so a real donate would never fire — we don't
    // click donate in this smoke, but insurance in case any page auto-fires it.
    await context.route(/\/functions\/v1\/create-checkout$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://stripe.test/mock" }),
      })
    );

    // Login as sponsor first.
    await page.goto("/auth");
    await page.getByTestId("login-email").fill(SPONSOR_EMAIL);
    await page.getByTestId("login-password").fill(SPONSOR_PASSWORD);
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/app", { timeout: 15_000 });

    // Grab a real deal id + chat id from what's already rendered.
    let dealId: string | null = null;
    try {
      const firstCard = page.getByTestId("deal-card").first();
      await firstCard.waitFor({ timeout: 5_000 });
      const href = await firstCard.getAttribute("href");
      if (href) {
        const m = href.match(/\/app\/deal\/([^/?#]+)/);
        if (m) dealId = m[1];
      }
      if (!dealId) {
        await firstCard.click();
        await page.waitForURL(/\/app\/deal\//, { timeout: 5_000 });
        const url = new URL(page.url());
        const m = url.pathname.match(/\/app\/deal\/([^/?#]+)/);
        if (m) dealId = m[1];
        await page.goto("/app");
      }
    } catch {
      // ignore — dealId stays null and we'll skip the deal detail route
    }

    const dynamicRoutes: { path: string; label: string }[] = [];
    if (dealId) dynamicRoutes.push({ path: `/app/deal/${dealId}`, label: "deal-detail" });

    const allRoutes = [...STATIC_ROUTES, ...dynamicRoutes];

    for (const { path, label } of allRoutes) {
      const consoleErrors: string[] = [];
      const networkErrors: { url: string; status: number; method: string }[] = [];

      const onConsole = (msg: ConsoleMessage) => {
        if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 500));
      };
      const onPageError = (err: Error) => {
        consoleErrors.push(`[pageerror] ${err.message}`.slice(0, 500));
      };
      const onResponse = (resp: Response) => {
        const s = resp.status();
        if (s >= 400) {
          const req: Request = resp.request();
          networkErrors.push({ url: resp.url(), status: s, method: req.method() });
        }
      };

      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      page.on("response", onResponse);

      const screenshot = join(OUT_DIR, `${label.replace(/[^a-z0-9-]/gi, "_")}.png`);
      const report: PageReport = {
        route: path,
        label,
        status: "ok",
        consoleErrors,
        networkErrors,
        screenshot,
      };

      try {
        const resp = await page.goto(path, { waitUntil: "networkidle", timeout: 20_000 });
        if (!resp) {
          report.status = "not-loaded";
          report.navError = "no response";
        } else if (resp.status() >= 400) {
          report.status = "not-loaded";
          report.navError = `HTTP ${resp.status()}`;
        }
        // Give the SPA a moment for hydration + first data fetch
        await page.waitForTimeout(1500);
      } catch (e) {
        report.status = "not-loaded";
        report.navError = e instanceof Error ? e.message : String(e);
      }

      try {
        await page.screenshot({ path: screenshot, fullPage: true });
      } catch {
        // ignore screenshot failure
      }

      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("response", onResponse);

      if (report.status === "ok" && (consoleErrors.length > 0 || networkErrors.length > 0)) {
        report.status = "broken";
      }
      reports.push(report);
    }

    // Dump JSON report so the test runner surfaces it clearly.
    const json = JSON.stringify(reports, null, 2);
    writeFileSync(join(OUT_DIR, "report.json"), json);
    console.log("\n=====SMOKE_REPORT_BEGIN=====");
    console.log(json);
    console.log("=====SMOKE_REPORT_END=====");

    // Fail only if _every_ page failed to load — we want the report even on partial breakage.
    const anyLoaded = reports.some((r) => r.status !== "not-loaded");
    expect(anyLoaded).toBeTruthy();
  });
});
