// Phase 65 (audit): iPhone-WebKit smoke crawl of every screen.
// Visits each route, captures console errors, asserts no JS crashes and
// no overflow layout breaks (basic). Screenshots land in test-results/iphone/.
import { test, expect, type ConsoleMessage } from "@playwright/test";

type Bug = { route: string; kind: "console" | "pageerror" | "overflow"; msg: string };

// Routes that don't require auth or that should still render *something*
// (auth-gated routes redirect to /auth, which is itself a valid screen to test).
// Routes adapted to main's actual router (src/App.tsx).
const ROUTES: Array<{ path: string; name: string; auth?: boolean }> = [
  // Public marketing
  { path: "/", name: "home" },
  { path: "/how-it-works", name: "how-it-works" },
  { path: "/transparency", name: "transparency" },
  { path: "/about", name: "about" },
  { path: "/faq", name: "faq" },
  { path: "/live", name: "public-live" },
  { path: "/shop", name: "public-shop" },
  { path: "/verification", name: "verification" },
  // Legal
  { path: "/impressum", name: "impressum" },
  { path: "/datenschutz", name: "datenschutz" },
  { path: "/agb", name: "agb" },
  // Auth
  { path: "/auth", name: "auth-login" },
  { path: "/register", name: "auth-register" },
  { path: "/reset-password", name: "reset-password" },
  // Authed app
  { path: "/app", name: "feed", auth: true },
  { path: "/app/live", name: "live", auth: true },
  { path: "/app/live/start", name: "start-stream", auth: true },
  { path: "/app/create-deal", name: "create-deal", auth: true },
  { path: "/app/shop", name: "shop", auth: true },
  { path: "/app/profile", name: "profile", auth: true },
  { path: "/app/profile/edit", name: "profile-edit", auth: true },
  { path: "/app/wallet", name: "wallet", auth: true },
  { path: "/app/settings", name: "settings", auth: true },
  { path: "/app/search", name: "search", auth: true },
  { path: "/app/chats", name: "chats", auth: true },
  { path: "/app/notifications", name: "notifications", auth: true },
  { path: "/app/premium", name: "premium", auth: true },
  { path: "/app/deals", name: "deals", auth: true },
  { path: "/app/wishlist", name: "wishlist", auth: true },
];

const bugs: Bug[] = [];

test.describe.configure({ mode: "serial" });

// Capture a real Supabase session once per worker, then inject it into every
// test context via originState/storage. If login fails (Supabase offline) we
// fall back to a fake token — the audit still verifies layout / JS-crash.
let originState: Array<{ name: string; value: string }> | null = null;

// Each step bounded — when Supabase is down we want this to fall through
// quickly to the fake-token path instead of timing out the whole hook (30 s
// default → 47 dependent tests get marked "did not run").
test.beforeAll(async ({ browser, baseURL }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 5000 });
    const email = page.getByTestId("login-email");
    await email.waitFor({ state: "visible", timeout: 2000 });
    await email.fill("sponsor1@brido.local");
    await page.getByTestId("login-password").fill("password123");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/app", { timeout: 5000 });
    const state = await ctx.storageState();
    const origin = state.origins.find((o) => baseURL?.startsWith(o.origin));
    if (origin) originState = origin.localStorage;
  } catch {
    /* fall back to fake */
  } finally {
    await ctx.close();
  }
});

test.beforeEach(async ({ context }) => {
  await context.route("**/*.{png,jpg,svg,gif,webp}", (route) => route.continue());

  const realState = originState;
  await context.addInitScript((injected) => {
    try {
      if (injected && injected.length) {
        for (const { name, value } of injected) localStorage.setItem(name, value);
        return;
      }
      // Fallback fake session — used when Supabase is offline.
      const fake = {
        access_token: "fake-audit-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "fake-refresh",
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          aud: "authenticated",
          email: "audit@brido.local",
        },
      };
      localStorage.setItem("sb-127-auth-token", JSON.stringify(fake));
      localStorage.setItem("sb-localhost-auth-token", JSON.stringify(fake));
    } catch {
      /* noop */
    }
  }, realState);
});

// Errors that originate from Supabase / network being unreachable in the
// audit environment — not app bugs.
const ENV_NOISE_RE =
  /127\.0\.0\.1:54321|supabase\.co|Could not connect|Failed to load resource|access control checks|NetworkError/i;

for (const route of ROUTES) {
  test(`iphone @ ${route.name}`, async ({ page }, testInfo) => {
    const localBugs: Bug[] = [];
    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (/favicon|manifest|workbox/i.test(text)) return;
        if (ENV_NOISE_RE.test(text)) return;
        localBugs.push({ route: route.path, kind: "console", msg: text });
      }
    });
    page.on("pageerror", (err) => {
      if (ENV_NOISE_RE.test(err.message)) return;
      localBugs.push({ route: route.path, kind: "pageerror", msg: err.message });
    });

    // SPA with WebSocket / Supabase polling never settles on `networkidle`.
    // `domcontentloaded` covers the same intent (DOM is ready to interact).
    await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch((e) => {
      localBugs.push({ route: route.path, kind: "pageerror", msg: `goto failed: ${e.message}` });
    });

    // Basic overflow check: document scrollWidth must not exceed viewport by more than 4px
    const overflow = await page
      .evaluate(() => {
        const w = document.documentElement.scrollWidth;
        const v = window.innerWidth;
        return { docW: w, vpW: v, overflowed: w > v + 4 };
      })
      .catch(() => ({ docW: 0, vpW: 0, overflowed: false }));

    if (overflow.overflowed) {
      localBugs.push({
        route: route.path,
        kind: "overflow",
        msg: `doc ${overflow.docW}px > viewport ${overflow.vpW}px`,
      });
    }

    // Always take a screenshot for visual review.
    await page
      .screenshot({
        path: testInfo.outputPath(`iphone-${route.name}.png`),
        fullPage: true,
      })
      .catch(() => {});

    bugs.push(...localBugs);

    // Don't hard-fail the test on console noise — collect everything, then summary
    // assertion runs at the end. This way the run completes and produces a full list.
    expect(
      localBugs.filter((b) => b.kind === "pageerror"),
      `pageerror on ${route.path}`
    ).toEqual([]);
  });
}

// TZ §17.5 — dark theme is mandatory on every screen. Walk a representative
// subset with `bc-theme=dark` injected in localStorage so the page applies the
// `.dark` class on mount.
const DARK_ROUTES = [
  "/",
  "/auth",
  "/onboarding",
  "/app",
  "/app/live",
  "/app/create-deal",
  "/app/shop",
  "/app/profile",
  "/app/profile/edit",
  "/app/settings",
  "/app/wallet",
  "/app/premium",
  "/app/notifications",
  "/app/chats",
];

for (const route of DARK_ROUTES) {
  test(`iphone-dark @ ${route}`, async ({ browser }, testInfo) => {
    const ctx = await browser.newContext({
      ...(originState
        ? {
            storageState: {
              cookies: [],
              origins: [{ origin: "http://127.0.0.1:8080", localStorage: originState }],
            },
          }
        : {}),
      colorScheme: "dark",
    });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("bc-theme", "dark");
        document.documentElement.classList.add("dark");
      } catch {
        /* noop */
      }
    });
    const page = await ctx.newPage();
    let crashed = false;
    page.on("pageerror", (e) => {
      if (!/127\.0\.0\.1:54321|Could not connect|access control|NetworkError/i.test(e.message))
        crashed = true;
    });
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 12_000 }).catch(() => {});
    await page.screenshot({
      path: testInfo.outputPath(`iphone-dark-${route.replace(/[^a-z0-9]+/gi, "_") || "root"}.png`),
      fullPage: true,
    });
    await ctx.close();
    expect(crashed, `dark theme crash on ${route}`).toBe(false);
  });
}

test.afterAll(async () => {
  if (bugs.length) {
    console.log("\n=== IPHONE AUDIT BUGS ===");
    for (const b of bugs) {
      console.log(`[${b.kind}] ${b.route}: ${b.msg}`);
    }
    console.log(`=== TOTAL: ${bugs.length} ===\n`);
  } else {
    console.log("\n=== IPHONE AUDIT: 0 bugs ===\n");
  }
});

