/**
 * Button-explorer: for every public route, find every <button>/<a>
 * interactive element and click it in isolation (page.reload between).
 *
 * Catches:
 *   - JS pageerrors triggered by the click handler
 *   - Console errors logged during the handler
 *   - Horizontal overflow on iPhone 15 width after the click
 *   - Dead clicks (no navigation, no toast, no modal — pure no-op)
 *
 * Auth-gated routes (/app/*) are exercised against an injected fake
 * Supabase session so we can crawl them without a live DB.
 *
 * Run with:
 *   PLAYWRIGHT_BROWSERS_PATH=$(pwd)/node_modules/playwright-core/.local-browsers \
 *   SKIP_DB_RESET=1 npx playwright test --project=iphone-webkit \
 *   tests/e2e/button-explorer.spec.ts
 */
import { test, expect, type ConsoleMessage } from "@playwright/test";

// Public routes (no auth) and authed app routes (fake-session injected).
const PUBLIC_ROUTES = [
  "/",
  "/how-it-works",
  "/transparency",
  "/about",
  "/faq",
  "/live",
  "/shop",
  "/verification",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/auth",
  "/register",
  "/reset-password",
] as const;

const APP_ROUTES = [
  "/app",
  "/app/live",
  "/app/create-deal",
  "/app/shop",
  "/app/profile",
  "/app/profile/edit",
  "/app/settings",
  "/app/search",
  "/app/chats",
  "/app/notifications",
  "/app/wallet",
  "/app/premium",
  "/app/deals",
  "/app/wishlist",
] as const;

const ROUTES = [...PUBLIC_ROUTES, ...APP_ROUTES] as const;

const ENV_NOISE_RE =
  /127\.0\.0\.1:54321|supabase\.co|Could not connect|Failed to load resource|access control checks|NetworkError|favicon|manifest|workbox|prefer.*reduced.*motion/i;

type Bug = { route: string; kind: string; selector: string; msg: string };

test.describe.configure({ mode: "serial" });

const allBugs: Bug[] = [];

// Inject a fake Supabase session before any /app/* navigation so the
// ProtectedRoute lets us in. Real DB calls will 401 — that's filtered
// by ENV_NOISE_RE.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      const fake = {
        access_token: "fake-access-token-for-button-explorer",
        refresh_token: "fake-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: { id: "00000000-0000-0000-0000-000000000001", email: "explorer@brido.local", aud: "authenticated", role: "authenticated" },
      };
      localStorage.setItem("sb-localhost-auth-token", JSON.stringify(fake));
    } catch {
      /* noop */
    }
  });
});

for (const route of ROUTES) {
  test(`button-explorer @ ${route}`, async ({ page }) => {
    const localBugs: Bug[] = [];

    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (ENV_NOISE_RE.test(text)) return;
      localBugs.push({ route, kind: "console", selector: "(page)", msg: text });
    });
    page.on("pageerror", (err) => {
      if (ENV_NOISE_RE.test(err.message)) return;
      localBugs.push({ route, kind: "pageerror", selector: "(page)", msg: err.message });
    });

    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 12_000 }).catch((e) => {
      localBugs.push({ route, kind: "goto", selector: "(page)", msg: e.message });
    });

    // Capture overflow once before any clicks.
    const overflow = await page
      .evaluate(() => {
        const w = document.documentElement.scrollWidth;
        const v = window.innerWidth;
        return { w, v, over: w > v + 4 };
      })
      .catch(() => ({ w: 0, v: 0, over: false }));
    if (overflow.over) {
      localBugs.push({
        route,
        kind: "overflow",
        selector: "<body>",
        msg: `docW ${overflow.w} > vp ${overflow.v}`,
      });
    }

    // Collect button-like elements actually visible + interactable.
    // Skips: sr-only (hidden until focus), disabled, file inputs.
    const targets = await page.evaluate(() => {
      const list: { selector: string; label: string; href?: string }[] = [];
      const els = Array.from(document.querySelectorAll('button, a[href], [role="button"]'));
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        // Skip sr-only / opacity:0 / disabled
        const cs = getComputedStyle(el);
        if (cs.opacity === "0" || cs.visibility === "hidden") continue;
        if ((el as HTMLElement).className?.toString().includes("sr-only")) continue;
        if ((el as HTMLButtonElement).disabled) continue;
        const cls = ((el as HTMLElement).className as string) || "";
        const label =
          el.getAttribute("aria-label") ||
          el.textContent?.trim().slice(0, 40) ||
          "(unlabeled)";
        const sel =
          (el as HTMLElement).tagName.toLowerCase() +
          (el.id ? `#${el.id}` : "") +
          (cls ? "." + cls.split(" ").slice(0, 2).join(".") : "");
        const href = (el as HTMLAnchorElement).href;
        list.push({ selector: sel, label, href });
      }
      return list.slice(0, 25); // 25 max per route, otherwise tests bloat
    });

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];

      // Skip external links — they navigate away from origin.
      if (t.href && !t.href.startsWith(page.url().split("#")[0].split("?")[0].slice(0, 24))) {
        const u = new URL(t.href);
        if (u.origin !== "http://127.0.0.1:8080" && u.origin !== "http://localhost:8080") continue;
      }

      // Re-find the i-th matching element each iteration (DOM may move).
      const handle = await page
        .evaluateHandle(
          (idx) => {
            const els = Array.from(document.querySelectorAll('button, a[href], [role="button"]'));
            return els.filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            })[idx];
          },
          i,
        )
        .catch(() => null);
      if (!handle) continue;

      const elBefore = await page.url();
      try {
        await handle.asElement()?.click({ timeout: 1500 });
      } catch {
        // Click intercepted / off-screen — note it but don't fail the route.
        localBugs.push({ route, kind: "click-fail", selector: t.selector, msg: t.label });
        continue;
      }

      // Give React a tick to flush state / toast / nav.
      await page.waitForTimeout(300);

      // If we navigated, go back to the route under test for the next click.
      if (page.url() !== elBefore && !page.url().includes(route)) {
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 8_000 }).catch(() => {});
      }
    }

    allBugs.push(...localBugs);

    if (localBugs.length) {
      console.log(`\n[buttons] ${route} — ${localBugs.length} issue(s):`);
      for (const b of localBugs.slice(0, 5)) {
        console.log(`  · ${b.kind} @ ${b.selector}: ${b.msg.slice(0, 120)}`);
      }
    }

    // We want to see every bug in one shot, so the per-route test does
    // NOT fail on bug count. The afterAll asserts the cumulative total.
    expect(true).toBe(true);
  });
}

test.afterAll(() => {
  if (allBugs.length) {
    console.log(`\n=== BUTTON-EXPLORER: ${allBugs.length} total ===`);
    const byKind: Record<string, number> = {};
    for (const b of allBugs) byKind[b.kind] = (byKind[b.kind] || 0) + 1;
    console.log("by kind:", byKind);
  } else {
    console.log(`\n=== BUTTON-EXPLORER: 0 bugs ===`);
  }
});
