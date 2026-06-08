// Reset DB + reseed before the Playwright run.
// Keeps tests deterministic regardless of prior state.
// Set SKIP_DB_RESET=1 to bypass (used by iphone-audit which is read-only).
import { execSync } from "node:child_process";

export default async function globalSetup() {
  if (process.env.SKIP_DB_RESET === "1") {
    console.log("[global-setup] SKIP_DB_RESET=1 — skipping db reset/seed");
    return;
  }
  console.log("[global-setup] supabase db reset...");
  execSync("supabase db reset", { stdio: "inherit" });
  console.log("[global-setup] seed-local.mjs...");
  execSync("node scripts/seed-local.mjs", { stdio: "inherit" });
}
