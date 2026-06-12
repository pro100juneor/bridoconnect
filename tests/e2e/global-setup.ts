// Reset DB + reseed before the Playwright run.
// Keeps tests deterministic regardless of prior state.
// Set SKIP_DB_RESET=1 to bypass (used by iphone-audit which is read-only).
import { execFileSync } from "node:child_process";

function deriveSupabaseEnv() {
  try {
    const out = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
    const env: Record<string, string> = {};
    for (const line of out.split("\n")) {
      const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
      if (m) env[m[1]] = m[2];
    }
    return {
      SUPABASE_URL: env.API_URL || "http://127.0.0.1:54321",
      SUPABASE_SERVICE_ROLE: env.SERVICE_ROLE_KEY || "",
    };
  } catch {
    return { SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE: "" };
  }
}

export default async function globalSetup() {
  if (process.env.SKIP_DB_RESET === "1") {
    console.log("[global-setup] SKIP_DB_RESET=1 — skipping db reset/seed");
    return;
  }
  console.log("[global-setup] supabase db reset...");
  execFileSync("supabase", ["db", "reset"], { stdio: "inherit" });
  console.log("[global-setup] seed-local.mjs...");
  const extra = deriveSupabaseEnv();
  execFileSync("node", ["scripts/seed-local.mjs"], {
    stdio: "inherit",
    env: { ...process.env, ...extra },
  });
}
