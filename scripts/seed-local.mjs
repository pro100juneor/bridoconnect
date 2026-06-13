// Seed local Supabase against current schema (migrations 001-007).
// Usage: SUPABASE_SERVICE_ROLE=<key> node scripts/seed-local.mjs
// Get the key from `supabase status` after `supabase start`.
//
// Schema reference (migrations/001_initial_schema.sql):
//   profiles(id, name, city, country, bio, avatar_url, role, verified,
//            rating, deals_count, total_helped, created_at)
//   deals(id, creator_id, sponsor_id, title, description, category,
//         amount, raised, currency, status, urgent, created_at, updated_at)
//
// Password for all seeded users: "password123"
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
if (!SERVICE_ROLE) {
  console.error("SUPABASE_SERVICE_ROLE is required. Run `supabase status` and export it.");
  process.exit(1);
}

const sb = createClient(URL, SERVICE_ROLE, { auth: { persistSession: false } });

// MO1 (audit): seed strings ship in git history. Only synthetic personas.
const SPONSORS = [
  { email: "sponsor1@brido.local", name: "Test Sponsor 1", city: "Berlin",  country: "DE" },
  { email: "sponsor2@brido.local", name: "Test Sponsor 2", city: "München", country: "DE" },
];

const EXECUTORS = [
  { email: "exec1@brido.local", name: "Test Recipient 1", city: "DEMO", country: "Україна", verified: true,  bio: "DEMO seed — not a real person." },
  { email: "exec2@brido.local", name: "Test Recipient 2", city: "DEMO", country: "Україна", verified: true,  bio: "DEMO seed — not a real person." },
  { email: "exec3@brido.local", name: "Test Recipient 3", city: "DEMO", country: "Україна", verified: false, bio: "DEMO seed — not a real person." },
];

const DEALS = [
  { creator: 0, title: "Допомога з орендою",  description: "Тимчасове житло на місяць.", category: "Житло",  amount: 320, raised: 200, status: "active", urgent: false },
  { creator: 1, title: "Продукти на тиждень", description: "Сім'я з 3 дітей.",            category: "Їжа",    amount: 150, raised:  50, status: "active", urgent: true  },
  { creator: 0, title: "Зимовий одяг",        description: "Куртки + взуття.",            category: "Одяг",   amount: 200, raised:   0, status: "active", urgent: false },
];

async function ensureUser({ email, name, role, city, country, bio, verified }) {
  // Try create; if already exists, fetch.
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
    user_metadata: { name, role },
  });
  let userId;
  if (error) {
    if (!/already.*registered|exists/i.test(error.message)) throw error;
    const list = await sb.auth.admin.listUsers();
    const found = list.data?.users.find((u) => u.email === email);
    if (!found) throw new Error(`User ${email} not found after duplicate-error`);
    userId = found.id;
  } else {
    userId = data.user.id;
  }

  // handle_new_user trigger inserted profile with defaults — update remaining fields.
  const patch = { name, role };
  if (city != null)      patch.city = city;
  if (country != null)   patch.country = country;
  if (bio != null)       patch.bio = bio;
  if (verified != null)  patch.verified = verified;
  // Seed verified recipients as fully Connect-onboarded so donate flow isn't blocked
  // by the UI gate. Tests use page.route to mock the actual Stripe call.
  if (role === "recipient" && verified) {
    patch.stripe_connect_account_id = `acct_test_${userId.slice(0, 8)}`;
    patch.stripe_connect_status = "enabled";
    patch.stripe_connect_country = "DE";
  }
  const { error: pErr } = await sb.from("profiles").update(patch).eq("id", userId);
  if (pErr) throw pErr;
  return userId;
}

async function main() {
  console.log("Seeding sponsors...");
  const sponsorIds = [];
  for (const s of SPONSORS) {
    const id = await ensureUser({ ...s, role: "sponsor" });
    sponsorIds.push(id);
    console.log(`  ${s.email} -> ${id}`);
  }

  console.log("Seeding recipients (executors)...");
  const executorIds = [];
  for (const e of EXECUTORS) {
    const id = await ensureUser({ ...e, role: "recipient" });
    executorIds.push(id);
    console.log(`  ${e.email} -> ${id}`);
  }

  // Deals: clear previous DEMO deals from these executors, then insert fresh ones.
  console.log("Seeding deals...");
  const { error: dDel } = await sb.from("deals").delete().in("creator_id", executorIds);
  if (dDel) console.warn("deal delete:", dDel.message);
  const dealRows = DEALS.map((d) => ({
    creator_id: executorIds[d.creator],
    title: d.title,
    description: d.description,
    category: d.category,
    amount: d.amount,
    raised: d.raised,
    currency: "EUR",
    status: d.status,
    urgent: d.urgent,
  }));
  const { error: dErr } = await sb.from("deals").insert(dealRows);
  if (dErr) throw dErr;
  console.log(`  ${dealRows.length} deals inserted`);

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
