import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// CORS: allow only the known production frontend (+ localhost for dev).
// Previously was `*` — anyone could create Stripe sessions from any site.
const ALLOWED_ORIGINS = new Set([
  "https://bridoconnect.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
]);

function corsFor(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://bridoconnect.vercel.app";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

// Cap a single Stripe checkout amount. Real limits depend on payment
// method / KYC tier; this is a server-side sanity ceiling against
// fat-finger / abuse.
const MIN_EUR = 1;
const MAX_EUR = 10_000;

serve(async (req) => {
  const headers = corsFor(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    // 1. Auth: previously this endpoint accepted any caller. Now require
    //    a logged-in Supabase user; webhook ties payment back via metadata.user_id.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );
    const authHeader = req.headers.get("Authorization");
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace("Bearer ", "") || "");
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { amount, dealId, type, priceId } = await req.json();

    // 2. Validate type enum — only known types allowed.
    if (type !== undefined && !["subscription", "deposit", "deal"].includes(type)) {
      return new Response(JSON.stringify({ error: "invalid type" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // 3. Pin redirect origin to a known frontend. Header `origin` was
    //    previously trusted → open redirect to any site.
    const reqOrigin = req.headers.get("origin");
    const origin = reqOrigin && ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : "https://bridoconnect.vercel.app";

    let session;

    if (type === "subscription" && priceId) {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/app/premium?success=true`,
        cancel_url: `${origin}/app/premium`,
        metadata: { type: "subscription", user_id: user.id },
      });
    } else {
      // 4. Validate amount range — was `Math.round((amount || 50) * 100)` with no bounds.
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt < MIN_EUR || amt > MAX_EUR) {
        return new Response(JSON.stringify({ error: `amount must be ${MIN_EUR}-${MAX_EUR} EUR` }), {
          status: 400, headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: dealId ? "Допомога по угоді BridoConnect" : "Поповнення гаманця BridoConnect",
              description: dealId ? `Deal ID: ${dealId}` : "Баланс рахунку",
            },
            unit_amount: Math.round(amt * 100),
          },
          quantity: 1,
        }],
        success_url: `${origin}/app/wallet?success=true`,
        cancel_url: `${origin}/app/wallet`,
        metadata: { dealId: dealId || "", type: type || "deposit", user_id: user.id },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
