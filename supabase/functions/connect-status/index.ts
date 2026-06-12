import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

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
    Vary: "Origin",
  };
}

serve(async (req) => {
  const headers = corsFor(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    const authHeader = req.headers.get("Authorization");
    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader?.replace("Bearer ", "") || "");
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, stripe_connect_status")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({
          has_account: false,
          status: "none",
          charges_enabled: false,
          payouts_enabled: false,
          requirements_due: [],
        }),
        { headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const acct = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    const computed =
      acct.charges_enabled && acct.payouts_enabled
        ? "enabled"
        : acct.requirements?.disabled_reason
          ? "restricted"
          : "pending";

    // Sync DB if drifted (webhook may not have arrived yet).
    if (computed !== profile.stripe_connect_status) {
      await supabase
        .from("profiles")
        .update({
          stripe_connect_status: computed,
          stripe_connect_country: acct.country || null,
          stripe_connect_updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    return new Response(
      JSON.stringify({
        has_account: true,
        status: computed,
        charges_enabled: acct.charges_enabled,
        payouts_enabled: acct.payouts_enabled,
        requirements_due: acct.requirements?.currently_due ?? [],
        country: acct.country,
      }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
