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

// Destination-charge flow: funds already moved to recipient's Connect balance
// at capture time. release_escrow flips deal.status=completed and records
// the ledger entry. If you switch to manual-transfer mode (separate charge
// + transfer), this is where stripe.transfers.create() would fire.
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

    const { dealId } = await req.json();
    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { data: deal, error: dErr } = await supabase
      .from("deals")
      .select(
        "id, creator_id, sponsor_id, status, stripe_payment_intent_id, amount_cents, platform_fee_cents, escrow_released_at"
      )
      .eq("id", dealId)
      .maybeSingle();
    if (dErr || !deal) {
      return new Response(JSON.stringify({ error: "deal not found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (deal.sponsor_id !== user.id) {
      return new Response(JSON.stringify({ error: "only sponsor may release" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (deal.escrow_released_at) {
      return new Response(JSON.stringify({ ok: true, already: true }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (!deal.stripe_payment_intent_id) {
      return new Response(JSON.stringify({ error: "no payment intent on deal" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Fetch PI to recover transfer id (destination charges create it auto).
    const pi = await stripe.paymentIntents.retrieve(deal.stripe_payment_intent_id, {
      expand: ["latest_charge"],
    });
    const charge = pi.latest_charge as Stripe.Charge | null;
    const transferId = charge?.transfer as string | Stripe.Transfer | null;
    const transferStringId = typeof transferId === "string" ? transferId : (transferId?.id ?? null);

    const { error: rpcErr } = await supabase.rpc("release_escrow", {
      p_deal_id: dealId,
      p_transfer_id: transferStringId,
    });
    if (rpcErr) throw rpcErr;

    // Ledger entry for recipient (escrow_release leg).
    const netCents = (deal.amount_cents || 0) - (deal.platform_fee_cents || 0);
    await supabase.from("transactions").insert({
      processor: "stripe",
      stripe_event_id: `release::${dealId}`,
      user_id: deal.creator_id,
      deal_id: dealId,
      amount: netCents / 100,
      amount_cents: netCents,
      type: "escrow_release",
      status: "completed",
      stripe_payment_intent_id: deal.stripe_payment_intent_id,
    });

    return new Response(JSON.stringify({ ok: true, transferId: transferStringId }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
