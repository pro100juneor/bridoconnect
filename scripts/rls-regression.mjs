#!/usr/bin/env node
// Phase 4 (audit) — RLS / RPC ACL regression script.
// Verifies critical security invariants:
//   1. Anonymous POST to confirm_deal_payment returns 42501 (was C1 — anon mint).
//   2. Anon SELECT on profiles returns [] (only `public_profiles` view is public).
//   3. Anon SELECT on wishlist_items returns [] (was C9).
//   4. Anon execution of all SECURITY DEFINER RPCs is denied (C3 pattern).
//   5. Anon execution of GDPR RPCs is denied.
//
// Usage:
//   SUPABASE_URL=http://127.0.0.1:54321 \
//   SUPABASE_ANON_KEY=<anon-key> \
//   node scripts/rls-regression.mjs
//
// Exit 0 if all invariants hold; exit 1 with details if any fail.
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY;
if (!ANON) {
  console.error("Set SUPABASE_ANON_KEY env var (`supabase status` will print it).");
  process.exit(2);
}

const sb = createClient(URL, ANON, { auth: { persistSession: false } });

const failures = [];

async function check(name, fn) {
  try {
    const result = await fn();
    if (result === true) {
      console.log(`✓ ${name}`);
    } else {
      console.log(`✗ ${name}: ${result}`);
      failures.push(`${name}: ${result}`);
    }
  } catch (e) {
    console.log(`✗ ${name}: threw ${e.message}`);
    failures.push(`${name}: ${e.message}`);
  }
}

// 1. confirm_deal_payment must reject anon (full signature per money-state-machine
//    migration: p_deal_id + p_provider + p_provider_intent_id + p_amount_cents
//    + p_fee_cents + p_method).
await check("anon confirm_deal_payment rejected", async () => {
  const { error } = await sb.rpc("confirm_deal_payment", {
    p_deal_id: "00000000-0000-0000-0000-000000000000",
    p_provider: "stripe",
    p_provider_intent_id: "pi_fake",
    p_amount_cents: 100,
    p_fee_cents: 5,
  });
  if (!error) return "expected error, got success";
  if (error.code !== "42501" && !/permission denied|not allowed|insufficient/i.test(error.message)) {
    return `wrong error code: ${error.code} ${error.message}`;
  }
  return true;
});

// 2. profiles table — anon SELECT must return []
await check("anon SELECT profiles returns []", async () => {
  const { data, error } = await sb.from("profiles").select("user_id").limit(5);
  if (error) return `unexpected error: ${error.message}`;
  if (!Array.isArray(data) || data.length > 0) return `leaked ${data?.length ?? "?"} rows`;
  return true;
});

// 3. wishlist_items — anon SELECT must return []
await check("anon SELECT wishlist_items returns []", async () => {
  const { data, error } = await sb.from("wishlist_items").select("id").limit(5);
  if (error) return `unexpected error: ${error.message}`;
  if (!Array.isArray(data) || data.length > 0) return `leaked ${data?.length ?? "?"} rows`;
  return true;
});

// 4. public_profiles VIEW — anon SELECT can return rows but ONLY safe columns
await check("anon SELECT public_profiles returns safe columns only", async () => {
  const { data, error } = await sb.from("public_profiles").select("*").limit(1);
  if (error) return `unexpected error: ${error.message}`;
  if (!data?.length) return true; // empty is fine; means no public profiles seeded
  const row = data[0];
  const forbidden = ["balance_cents", "total_donated_cents", "total_received_cents", "email"];
  for (const k of forbidden) {
    if (k in row) return `forbidden column "${k}" exposed`;
  }
  return true;
});

// 5. GDPR RPCs — anon must be denied
for (const rpc of ["request_account_deletion", "cancel_account_deletion", "export_user_data"]) {
  await check(`anon ${rpc} rejected`, async () => {
    const { error } = await sb.rpc(rpc);
    if (!error) return "expected error, got success";
    if (!/permission denied|unauthorized|not allowed/i.test(error.message) && error.code !== "42501") {
      return `wrong error: ${error.code} ${error.message}`;
    }
    return true;
  });
}

// 6. release_escrow — anon denied
await check("anon release_escrow rejected", async () => {
  const { error } = await sb.rpc("release_escrow", {
    p_deal_id: "00000000-0000-0000-0000-000000000000",
  });
  if (!error) return "expected error, got success";
  if (!/permission denied|unauthorized|not allowed/i.test(error.message) && error.code !== "42501") {
    return `wrong error: ${error.code} ${error.message}`;
  }
  return true;
});

// 7. resolve_dispute — anon denied (full signature: p_dispute_id + p_decision)
await check("anon resolve_dispute rejected", async () => {
  const { error } = await sb.rpc("resolve_dispute", {
    p_dispute_id: "00000000-0000-0000-0000-000000000000",
    p_decision: "refund_sponsor",
  });
  if (!error) return "expected error, got success";
  if (!/permission denied|unauthorized|not allowed/i.test(error.message) && error.code !== "42501") {
    return `wrong error: ${error.code} ${error.message}`;
  }
  return true;
});

console.log(failures.length === 0 ? "\nRLS regression: ALL PASS" : `\nRLS regression: ${failures.length} FAILED`);
process.exit(failures.length === 0 ? 0 : 1);
