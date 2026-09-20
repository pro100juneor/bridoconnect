/**
 * qa-crawl — exhaustive multi-role QA sweep.
 *
 * For each role (anon / sponsor / recipient / admin) it:
 *   1. logs in (anon skips),
 *   2. visits EVERY route from App.tsx (dynamic :id/:slug resolved from the
 *      seeded dataset),
 *   3. records: uncaught pageerrors, console errors, hard network failures
 *      (>=400 that are not soft-guard reads), missing render (#root empty),
 *      possible untranslated i18n keys,
 *   4. clicks every visible <button>/<a>/[role=button] in isolation and
 *      classifies the response: navigates / opens dialog / shows toast /
 *      error-on-click / dead (button with no observable effect),
 *   5. checks role access (anon guard redirect, admin gate).
 *
 * Findings are written to test-results/qa-crawl/<role>.json and summarised
 * to stdout. The test never fails on findings — the whole point is to collect
 * every issue in one run; a maintainer reads the report.
 *
 * Run (WebKit / iPhone, matches the app's WKWebView):
 *   npx playwright test qa-crawl --project=iphone-webkit --reporter=line
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { test, type ConsoleMessage, type Page, type Response } from "@playwright/test";

// ---------- local supabase env + id resolution ----------
function statusEnv(): Record<string, string> {
  const out = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
  const env: Record<string, string> = {};
  for (const line of out.split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const ENV = (() => {
  try {
    return statusEnv();
  } catch {
    return {} as Record<string, string>;
  }
})();

function rest(path: string): unknown[] {
  const api = ENV.API_URL;
  const key = ENV.SERVICE_ROLE_KEY ?? ENV.ANON_KEY;
  if (!api || !key) return [];
  try {
    const body = execFileSync(
      "curl",
      ["-s", `${api}/rest/v1/${path}`, "-H", `apikey: ${key}`, "-H", `Authorization: Bearer ${key}`],
      { encoding: "utf8" }
    );
    const j = JSON.parse(body);
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

function oneId(table: string, filter = ""): string {
  const rows = rest(`${table}?select=id${filter ? "&" + filter : ""}&limit=1`);
  return (rows[0] as { id?: string })?.id ?? "";
}

const SELLER_ID = oneId("profiles", "name=eq.Test%20Seller");
const SPONSOR_ID = oneId("profiles", "name=eq.Test%20Sponsor%201");
const RECIPIENT_ID = oneId("profiles", "name=eq.Test%20Recipient%201");
const DEAL_ID = oneId("deals");
const PRODUCT_ID = oneId("products");
const STREAM_ID = oneId("streams");
const SHOP_SLUG = (rest("shop_profiles?select=slug&limit=1")[0] as { slug?: string })?.slug ?? "";

// ---------- route catalogue ----------
const PUBLIC_ROUTES = [
  "/",
  "/home",
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
  "/support",
  ...(SHOP_SLUG ? [`/store/${SHOP_SLUG}`, `/u/${SHOP_SLUG}`] : []),
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
  "/app/profile",
  "/app/profile/edit",
  "/app/my-page",
  "/app/search",
  "/app/promote",
  "/app/chats",
  "/app/notifications",
  "/app/deals",
  "/app/wallet",
  "/app/wishlist",
  "/app/sponsor-privacy",
  "/app/settings",
  "/app/admin",
  "/app/premium",
  ...(SELLER_ID
    ? [`/app/shop/seller/${SELLER_ID}`, `/app/user/${SELLER_ID}`, `/app/sponsor/${SELLER_ID}`]
    : []),
  ...(PRODUCT_ID ? [`/app/shop/${PRODUCT_ID}`] : []),
  ...(STREAM_ID ? [`/app/live/${STREAM_ID}`] : []),
  ...(DEAL_ID ? [`/app/deal/${DEAL_ID}`, `/app/dispute/${DEAL_ID}`] : []),
];

const ROLES = {
  anon: { email: "", password: "", routes: PUBLIC_ROUTES },
  sponsor: {
    email: "sponsor1@brido.local",
    password: "password123",
    routes: [...PUBLIC_ROUTES, ...APP_ROUTES],
  },
  recipient: {
    email: "seller@brido.local",
    password: "password123",
    routes: [...PUBLIC_ROUTES, ...APP_ROUTES],
  },
  admin: { email: "oleksii@brido.local", password: "Oleksii", routes: [...PUBLIC_ROUTES, ...APP_ROUTES] },
} as const;

// ---------- noise filters ----------
// With a real local backend most calls succeed, so we filter only genuinely
// irrelevant browser noise, NOT app/supabase errors.
const CONSOLE_NOISE =
  /favicon|manifest\.json|ResizeObserver loop|reduced.*motion|Download the React DevTools|\[vite\]|preloaded using link preload|Lighthouse|sourcemap|Failed to load resource|WebSocket connection to|realtime\/v1\/websocket|Failed to fetch|NetworkError|Load failed/i;
// Soft statuses = expected on empty/guarded PostgREST reads or auth probes.
const SOFT_NET = new Set([401, 403, 404, 406, 409, 416]);
// Edge functions need secrets absent locally (Stripe/LiveKit/Resend) — tag,
// don't count as app bugs.
const DEGRADED_FN =
  /\/functions\/v1\/(create-checkout|create-identity-session|connect-|release-escrow|start-stream|send-email|livekit|refresh-fx|promote|paypal|wise|adyen|btcpay|identity|payout)/i;
// Local stack realtime websocket has no gateway → connection errors are env,
// not app bugs.
const DEGRADED_NET = /realtime\/v1\/websocket|\/functions\/v1\//i;

type Finding = {
  role: string;
  route: string;
  kind: string; // pageerror | console | network | render | i18n | click-error | dead-button | access
  detail: string;
  selector?: string;
  severity: "high" | "med" | "low" | "info";
};

const ALL: Finding[] = [];

async function dismissCookies(page: Page) {
  try {
    const btn = page
      .getByRole("button", { name: /Тільки необхідні|Прийняти все|Accept|Nur notwendige/i })
      .first();
    if (await btn.count()) await btn.click({ timeout: 1500 });
  } catch {
    /* already dismissed */
  }
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await dismissCookies(page);
  await page.getByTestId("login-email").fill(email, { timeout: 5000 });
  await page.getByTestId("login-password").fill(password, { timeout: 5000 });
  await page.getByTestId("login-submit").click({ timeout: 5000 });
  await page.waitForURL("**/app", { timeout: 20_000 });
  await dismissCookies(page);
  await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
}

function isKeyLike(s: string): boolean {
  // "deal.create.title" — looks like an untranslated i18n key.
  if (!/^[a-z][a-z0-9]*(\.[a-z0-9_]+){1,}$/i.test(s)) return false;
  if (/\d+\.\d+/.test(s)) return false; // versions / decimals
  if (/\.(com|de|org|net|local|io|app|json|png|jpg|svg|ts|tsx)$/i.test(s)) return false;
  return true;
}

async function scanRoute(page: Page, role: string, route: string): Promise<Finding[]> {
  const found: Finding[] = [];
  const consoleErrs: string[] = [];
  const netErrs: string[] = [];
  const pageErrs: string[] = [];

  const onConsole = (m: ConsoleMessage) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (CONSOLE_NOISE.test(t)) return;
    consoleErrs.push(t.slice(0, 240));
  };
  const onPageError = (e: Error) => {
    pageErrs.push(`${e.message}`.slice(0, 240));
  };
  const onResponse = (r: Response) => {
    const s = r.status();
    if (s < 400 || SOFT_NET.has(s)) return;
    const url = r.url();
    const short = url.replace(/https?:\/\/[^/]+/, "");
    if (DEGRADED_FN.test(url) || DEGRADED_NET.test(url)) {
      netErrs.push(`[degraded] ${s} ${short}`);
    } else {
      netErrs.push(`${s} ${short}`);
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  let navStatus = 0;
  try {
    const resp = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 20_000 });
    navStatus = resp?.status() ?? 0;
  } catch (e) {
    found.push({
      role,
      route,
      kind: "render",
      detail: `goto failed: ${(e as Error).message}`.slice(0, 160),
      severity: "high",
    });
  }
  await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(400);

  const landed = page.url();

  // anon on /app/* must be redirected to /auth (route guard).
  if (role === "anon" && route.startsWith("/app")) {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("response", onResponse);
    if (!/\/auth/.test(landed)) {
      found.push({
        role,
        route,
        kind: "access",
        detail: `anon NOT redirected to /auth, landed ${landed}`,
        severity: "high",
      });
    }
    return found; // don't click as anon inside app
  }

  // render check
  const rendered = await page
    .evaluate(() => !!document.querySelector("#root")?.children?.length)
    .catch(() => false);
  if (!rendered) {
    found.push({ role, route, kind: "render", detail: "#root empty (blank screen)", severity: "high" });
  }

  // screenshot for visual review
  try {
    const safe = route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
    mkdirSync(`test-results/qa-crawl/shots/${role}`, { recursive: true });
    await page.screenshot({ path: `test-results/qa-crawl/shots/${role}/${safe}.png`, fullPage: true });
  } catch {
    /* screenshot best-effort */
  }

  // i18n heuristic
  const keys = await page
    .evaluate(() => {
      const out: string[] = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walk.nextNode())) {
        const txt = (n.textContent ?? "").trim();
        if (txt && txt.length < 60 && !txt.includes(" ")) out.push(txt);
      }
      return Array.from(new Set(out));
    })
    .catch(() => [] as string[]);
  for (const k of keys) {
    if (isKeyLike(k))
      found.push({ role, route, kind: "i18n", detail: `possible raw key: "${k}"`, severity: "low" });
  }

  // clickable inventory
  const targets = await page
    .evaluate(() => {
      const list: { idx: number; label: string; tag: string; href: string }[] = [];
      const els = Array.from(document.querySelectorAll('button, a[href], [role="button"]'));
      let idx = -1;
      for (const el of els) {
        idx++;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.opacity === "0" || cs.visibility === "hidden") continue;
        if ((el as HTMLElement).className?.toString().includes("sr-only")) continue;
        if ((el as HTMLButtonElement).disabled) continue;
        const label = (el.getAttribute("aria-label") || el.textContent?.trim() || "(unlabeled)").slice(0, 48);
        list.push({ idx, label, tag: el.tagName.toLowerCase(), href: (el as HTMLAnchorElement).href || "" });
      }
      return list.slice(0, 40);
    })
    .catch(() => [] as { idx: number; label: string; tag: string; href: string }[]);

  const SKIP_LABEL = /вийти|вихід|log ?out|sign ?out|видалити акаунт|delete account/i;
  const origin = new URL(landed).origin;

  for (const tItem of targets) {
    if (SKIP_LABEL.test(tItem.label)) continue;
    if (tItem.href) {
      try {
        const u = new URL(tItem.href);
        if (u.origin !== origin) continue; // external link
      } catch {
        /* keep */
      }
    }

    // re-find the n-th visible clickable each time (DOM may reflow)
    const handle = await page
      .evaluateHandle((label) => {
        const els = Array.from(document.querySelectorAll('button, a[href], [role="button"]'));
        return els.find((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          const l = (el.getAttribute("aria-label") || el.textContent?.trim() || "").slice(0, 48);
          return l === label;
        }) as Element | undefined;
      }, tItem.label)
      .catch(() => null);
    const element = handle?.asElement();
    if (!element) continue;

    const errBefore = pageErrs.length;
    const consoleBefore = consoleErrs.length;
    const netBefore = netErrs.length;
    const urlBefore = page.url();
    // innerHTML length catches class/attr toggles (selected chip, aria-pressed)
    // that innerText misses — kills the dead-button false positives.
    const htmlBefore = await page.evaluate(() => document.body.innerHTML.length).catch(() => 0);
    // Elements that are clearly stateful toggles: never "dead".
    const isToggle = await handle!
      .evaluate((el) => {
        const e = el as HTMLElement;
        return (
          e.getAttribute("role") === "tab" ||
          e.getAttribute("role") === "switch" ||
          e.hasAttribute("aria-pressed") ||
          e.hasAttribute("aria-selected") ||
          e.hasAttribute("aria-expanded") ||
          e.hasAttribute("aria-checked")
        );
      })
      .catch(() => false);

    try {
      await element.click({ timeout: 1500 });
    } catch {
      // intercepted / detached — not necessarily a bug; skip quietly
      continue;
    }
    await page.waitForTimeout(300);

    const urlAfter = page.url();
    const navigated = urlAfter !== urlBefore;
    const marker = await page
      .evaluate(
        () =>
          document.querySelectorAll(
            '[role="dialog"],[role="alertdialog"],[data-radix-toast-root],li[data-state="open"],[role="status"],[role="alert"],[data-vaul-drawer]'
          ).length
      )
      .catch(() => 0);
    const htmlAfter = navigated
      ? -1
      : await page.evaluate(() => document.body.innerHTML.length).catch(() => 0);
    const newConsole = consoleErrs.length - consoleBefore;
    const newNet = netErrs.length - netBefore;
    const newErr = pageErrs.length - errBefore;
    const newRealNet = netErrs.slice(netBefore).filter((n) => !n.startsWith("[degraded]")).length;

    if (newErr > 0 || newConsole > 0) {
      found.push({
        role,
        route,
        kind: "click-error",
        selector: `${tItem.tag}:"${tItem.label}"`,
        detail:
          `click → ${newErr} pageerror, ${newConsole} console err` +
          (newNet ? `, ${newNet} net(${newRealNet} real)` : ""),
        severity: newErr > 0 || newConsole > 0 ? "high" : "med",
      });
    } else if (
      !navigated &&
      marker === 0 &&
      tItem.tag === "button" &&
      !isToggle &&
      htmlAfter === htmlBefore
    ) {
      found.push({
        role,
        route,
        kind: "dead-button",
        selector: `button:"${tItem.label}"`,
        detail: "click produced no navigation, dialog, toast or DOM change",
        severity: "low",
      });
    }

    // reset for next click
    if (navigated && !urlAfter.includes(route)) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(200);
    } else if (marker > 0) {
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(150);
    }
  }

  // record pageerrors / console / network collected for this route
  for (const p of pageErrs) found.push({ role, route, kind: "pageerror", detail: p, severity: "high" });
  for (const c of consoleErrs) found.push({ role, route, kind: "console", detail: c, severity: "med" });
  for (const nnn of netErrs) {
    found.push({
      role,
      route,
      kind: "network",
      detail: nnn,
      severity: nnn.startsWith("[degraded]") ? "info" : "med",
    });
  }

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  page.off("response", onResponse);
  return found;
}

test.describe.configure({ mode: "serial" });

for (const [role, cfg] of Object.entries(ROLES)) {
  test(`qa-crawl :: ${role}`, async ({ page }) => {
    test.setTimeout(20 * 60 * 1000);
    const findings: Finding[] = [];

    if (cfg.email) {
      try {
        await login(page, cfg.email, cfg.password);
      } catch (e) {
        findings.push({
          role,
          route: "/auth",
          kind: "access",
          detail: `login failed: ${(e as Error).message}`.slice(0, 160),
          severity: "high",
        });
        ALL.push(...findings);
        writeReport(role, findings);
        return;
      }
    }

    // admin-gate check for non-admin authenticated roles
    if (role === "sponsor" || role === "recipient") {
      await page.goto("/app/admin", { waitUntil: "domcontentloaded" }).catch(() => {});
      await page.waitForTimeout(600);
      const gated = await page
        .evaluate(() =>
          /Доступ обмежено|Тільки адміністратори|Access|обмежено/i.test(document.body.innerText)
        )
        .catch(() => false);
      if (!gated) {
        findings.push({
          role,
          route: "/app/admin",
          kind: "access",
          detail: `admin page not gated for role=${role}`,
          severity: "high",
        });
      }
    }

    for (const route of cfg.routes) {
      const f = await scanRoute(page, role, route);
      findings.push(...f);
      const hi = f.filter((x) => x.severity === "high").length;
      console.log(`[${role}] ${route} — ${f.length} finding(s)${hi ? ` (${hi} high)` : ""}`);
    }

    ALL.push(...findings);
    writeReport(role, findings);
  });
}

function writeReport(role: string, findings: Finding[]) {
  const dir = "test-results/qa-crawl";
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${role}.json`, JSON.stringify(findings, null, 2));
}

test.afterAll(() => {
  const dir = "test-results/qa-crawl";
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/_all.json`, JSON.stringify(ALL, null, 2));
  const byKind: Record<string, number> = {};
  const bySev: Record<string, number> = {};
  for (const f of ALL) {
    byKind[f.kind] = (byKind[f.kind] || 0) + 1;
    bySev[f.severity] = (bySev[f.severity] || 0) + 1;
  }
  console.log("\n=== QA-CRAWL SUMMARY ===");
  console.log("resolved ids:", {
    SELLER_ID: !!SELLER_ID,
    DEAL_ID: !!DEAL_ID,
    PRODUCT_ID: !!PRODUCT_ID,
    STREAM_ID: !!STREAM_ID,
    SHOP_SLUG: !!SHOP_SLUG,
  });
  console.log("total findings:", ALL.length);
  console.log("by kind:", byKind);
  console.log("by severity:", bySev);
});
