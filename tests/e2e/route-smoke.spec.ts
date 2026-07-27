import { test, expect, type ConsoleMessage, type Response } from "@playwright/test";

// Full-app route smoke: every route from App.tsx is visited and asserted to
// render (#root non-empty) with zero console errors and zero hard network
// failures (5xx and non-soft 4xx). Public routes run anonymously; app routes
// after login. Dynamic :id routes are filled from seeded staging data.
//
// Runs against whatever backend the dev server points at (staging by default).
// Requires seeded users, so bypass the docker db-reset globalSetup:
//   SKIP_DB_RESET=1 npx playwright test route-smoke --project=chromium
//
// Credentials + dynamic ids are overridable via env for CI/other datasets.

const EMAIL = process.env.SMOKE_EMAIL ?? "seller@brido.local";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "password123";
const SELLER = process.env.SMOKE_PROFILE_ID ?? "2f72d240-2c81-404f-91cc-366553d096a1";
const PRODUCT = process.env.SMOKE_PRODUCT_ID ?? "";
const DEAL = process.env.SMOKE_DEAL_ID ?? "";

const PUBLIC_ROUTES = [
  "/",
  "/how-it-works",
  "/transparency",
  "/live",
  "/about",
  "/faq",
  "/shop",
  "/verification",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/store/test-store",
  "/u/test-prodavets",
];

const APP_ROUTES = [
  "/app",
  "/app/live",
  "/app/live/start",
  "/app/create-deal",
  "/app/shop",
  "/app/cart",
  "/app/shop/new",
  "/app/shop/design",
  `/app/shop/seller/${SELLER}`,
  "/app/profile",
  "/app/profile/edit",
  "/app/my-page",
  "/app/sponsor-privacy",
  `/app/sponsor/${SELLER}`,
  "/app/search",
  "/app/chats",
  "/app/notifications",
  "/app/deals",
  "/app/wallet",
  "/app/wishlist",
  `/app/user/${SELLER}`,
  "/app/settings",
  "/app/admin",
  "/app/premium",
  "/app/promote",
  ...(PRODUCT ? [`/app/shop/${PRODUCT}`] : []),
  ...(DEAL ? [`/app/deal/${DEAL}`, `/app/dispute/${DEAL}`] : []),
];

// 401/403/404/406/409 are expected on some empty/guarded PostgREST reads.
const isSoftNet = (status: number) => [401, 403, 404, 406, 409].includes(status);

async function dismissCookies(page: import("@playwright/test").Page) {
  try {
    const btn = page.getByRole("button", { name: /Тільки необхідні|Прийняти все/ }).first();
    if (await btn.count()) await btn.click({ timeout: 2000 });
  } catch {
    /* banner already dismissed */
  }
}

async function assertRouteClean(page: import("@playwright/test").Page, route: string) {
  const consoleErrors: string[] = [];
  const netErrors: string[] = [];
  const onConsole = (m: ConsoleMessage) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
  };
  const onPageError = (e: Error) => consoleErrors.push(`[pageerror] ${e.message}`.slice(0, 200));
  const onResponse = (r: Response) => {
    const s = r.status();
    if (s >= 400 && !isSoftNet(s)) netErrors.push(`${s} ${r.url()}`);
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  const resp = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 25_000 });
  await page.waitForTimeout(900);
  const rendered = await page.evaluate(() => !!document.querySelector("#root")?.children?.length);

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  page.off("response", onResponse);

  expect(rendered, `${route}: #root should render`).toBeTruthy();
  expect(resp?.status() ?? 0, `${route}: nav status`).toBeLessThan(400);
  expect(consoleErrors, `${route}: console errors`).toEqual([]);
  expect(netErrors, `${route}: network errors`).toEqual([]);
}

test.describe("route smoke — public (anon)", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`public ${route}`, async ({ page }) => {
      await assertRouteClean(page, route);
    });
  }
});

test.describe("route smoke — app (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await dismissCookies(page);
    await page.getByTestId("login-email").fill(EMAIL);
    await page.getByTestId("login-password").fill(PASSWORD);
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/app", { timeout: 20_000 });
    await dismissCookies(page);
  });

  for (const route of APP_ROUTES) {
    test(`app ${route}`, async ({ page }) => {
      await assertRouteClean(page, route);
    });
  }
});

test.describe("route smoke — protected routes redirect anon to /auth", () => {
  for (const route of ["/app", "/app/wallet", "/app/settings"]) {
    test(`guard ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/auth/);
    });
  }
});
