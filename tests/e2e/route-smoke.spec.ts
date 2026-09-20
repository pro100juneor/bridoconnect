import { execFileSync } from "node:child_process";
import { test, expect, type ConsoleMessage, type Response } from "@playwright/test";

// Full-app route smoke: every route from App.tsx is visited and asserted to
// render (#root non-empty) with zero console errors and zero hard network
// failures (5xx and non-soft 4xx). Public routes run anonymously; app routes
// after login. Dynamic :id routes are filled from the seeded dataset.
//
// Runs against whatever backend the dev server points at (локальный стек,
// см. playwright.config.ts). Требует засеянных пользователей; чтобы пропустить
// docker db-reset из globalSetup:
//   SKIP_DB_RESET=1 npx playwright test route-smoke --project=chromium
//
// Credentials + dynamic ids are overridable via env for CI/other datasets.

const EMAIL = process.env.SMOKE_EMAIL ?? "seller@brido.local";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "password123";

/**
 * id профиля продавца нельзя зашивать константой: seed-local.mjs создаёт
 * пользователей через GoTrue, а тот выдаёт случайные UUID на каждый
 * `supabase db reset`. Прежний захардкоженный id остался от staging — после
 * перевода прогона на локальный стек запрос profiles?id=eq.<staging-id>
 * возвращал ноль строк, PostgREST отвечал 406 на .single(), и страницы
 * /app/user/:id, /app/sponsor/:id, /app/shop/seller/:id падали в smoke.
 *
 * Спрашиваем id по стабильному имени из сида («Test Seller») анонимным
 * ключом — profiles публично читаемы. Синхронно, потому что список маршрутов
 * нужен на этапе сбора тестов.
 */
function resolveSellerId(): string {
  if (process.env.SMOKE_PROFILE_ID) return process.env.SMOKE_PROFILE_ID;
  try {
    const status = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
    const api = status.match(/^API_URL="?([^"\n]*)"?$/m)?.[1];
    const anon = status.match(/^ANON_KEY="?([^"\n]*)"?$/m)?.[1];
    if (!api || !anon) return "";
    const body = execFileSync(
      "curl",
      ["-s", `${api}/rest/v1/profiles?select=id&name=eq.Test%20Seller&limit=1`, "-H", `apikey: ${anon}`],
      { encoding: "utf8" }
    );
    return (JSON.parse(body) as Array<{ id: string }>)[0]?.id ?? "";
  } catch {
    return "";
  }
}

const SELLER = resolveSellerId();
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
  ...(SELLER ? [`/app/shop/seller/${SELLER}`] : []),
  "/app/profile",
  "/app/profile/edit",
  "/app/my-page",
  "/app/sponsor-privacy",
  ...(SELLER ? [`/app/sponsor/${SELLER}`] : []),
  "/app/search",
  "/app/chats",
  "/app/notifications",
  "/app/deals",
  "/app/wallet",
  "/app/wishlist",
  ...(SELLER ? [`/app/user/${SELLER}`] : []),
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
  // Дать странице дозагрузиться: незавершённые fetch, оборванные следующим
  // goto, дают ложные "Failed to fetch" в консоли.
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(400);
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
    // Дождаться запросов фида: мгновенный goto следующего маршрута обрывает
    // их и даёт ложные "Failed to fetch" в консоли уже на целевой странице.
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
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
