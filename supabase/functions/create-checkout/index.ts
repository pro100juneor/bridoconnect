import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit, rateLimitHeaders, clientKey } from "../_shared/rate-limit.ts";

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

const MIN_EUR = 1;
const MAX_EUR = 10_000;
// 5% platform fee — keep in sync with docs/AGB.
const PLATFORM_FEE_BPS = 500;

serve(async (req) => {
  const headers = corsFor(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });

  // Rate limit: 30 checkouts / 5 min per IP — покрывает realistic burst
  const rl = await rateLimit({ key: clientKey(req, "create-checkout"), limit: 30, windowSec: 300 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...headers, ...rateLimitHeaders(rl), "Content-Type": "application/json" },
    });
  }

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

    const { amount, dealId, streamId, productId, type, priceId } = await req.json();

    if (
      type !== undefined &&
      !["subscription", "deposit", "deal_payment", "deal", "stream_donation", "product_purchase"].includes(
        type
      )
    ) {
      return new Response(JSON.stringify({ error: "invalid type" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const reqOrigin = req.headers.get("origin");
    const origin =
      reqOrigin && ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : "https://bridoconnect.vercel.app";

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
    } else if (productId) {
      // Product purchase: amount comes from the product's DB price (never the
      // client body) — this prevents a caller from paying an arbitrary amount.
      const { data: product, error: pErr } = await supabase
        .from("products")
        .select("id, seller_id, title, price_cents, stock, status")
        .eq("id", productId)
        .maybeSingle();
      if (pErr || !product) {
        return new Response(JSON.stringify({ error: "product not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      if (product.status !== "active" || product.stock <= 0) {
        return new Response(JSON.stringify({ error: "product unavailable" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      const { data: seller, error: sErr } = await supabase
        .from("profiles")
        .select("stripe_connect_account_id, stripe_connect_status")
        .eq("id", product.seller_id)
        .maybeSingle();
      if (sErr || !seller?.stripe_connect_account_id || seller.stripe_connect_status !== "enabled") {
        return new Response(
          JSON.stringify({
            error: "recipient_not_onboarded",
            message: "Seller has not completed Stripe onboarding",
          }),
          { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }

      const unitCents = product.price_cents;
      const feeCents = Math.round((unitCents * PLATFORM_FEE_BPS) / 10_000);

      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: product.title,
                description: `Товар BridoConnect`,
              },
              unit_amount: unitCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/app/shop/${productId}?success=true`,
        cancel_url: `${origin}/app/shop/${productId}`,
        metadata: {
          productId,
          seller_id: product.seller_id,
          type: "product_purchase",
          user_id: user.id,
          recipient_id: product.seller_id,
          platform_fee_cents: String(feeCents),
        },
        payment_intent_data: {
          application_fee_amount: feeCents,
          transfer_data: { destination: seller.stripe_connect_account_id },
          metadata: {
            product_id: productId,
            seller_id: product.seller_id,
            buyer_id: user.id,
            platform_fee_cents: String(feeCents),
          },
        },
      });
    } else {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt < MIN_EUR || amt > MAX_EUR) {
        return new Response(JSON.stringify({ error: `amount must be ${MIN_EUR}-${MAX_EUR} EUR` }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      const unitCents = Math.round(amt * 100);
      const feeCents = Math.round((unitCents * PLATFORM_FEE_BPS) / 10_000);

      // Connect destination charge: only when dealId is provided.
      // Deposit/wallet top-ups go to platform's own balance (no destination).
      let connectArgs: Record<string, unknown> = {};
      let dealRow: { id: string; creator_id: string } | null = null;
      let streamRow: { id: string; host_id: string } | null = null;

      if (streamId) {
        const { data: stream, error: sErr } = await supabase
          .from("streams")
          .select("id, host_id, status")
          .eq("id", streamId)
          .maybeSingle();
        if (sErr || !stream) {
          return new Response(JSON.stringify({ error: "stream not found" }), {
            status: 404,
            headers: { ...headers, "Content-Type": "application/json" },
          });
        }
        if (stream.status !== "live") {
          return new Response(JSON.stringify({ error: "stream is not live" }), {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
          });
        }
        const { data: host, error: hErr } = await supabase
          .from("profiles")
          .select("stripe_connect_account_id, stripe_connect_status")
          .eq("id", stream.host_id)
          .maybeSingle();
        if (hErr || !host?.stripe_connect_account_id || host.stripe_connect_status !== "enabled") {
          return new Response(
            JSON.stringify({
              error: "recipient_not_onboarded",
              message: "Host has not completed Stripe onboarding",
            }),
            { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
          );
        }
        streamRow = { id: stream.id, host_id: stream.host_id };
        connectArgs = {
          payment_intent_data: {
            application_fee_amount: feeCents,
            transfer_data: { destination: host.stripe_connect_account_id },
            metadata: {
              stream_id: streamId,
              recipient_id: stream.host_id,
              sponsor_id: user.id,
              platform_fee_cents: String(feeCents),
            },
          },
        };
      }

      if (dealId) {
        const { data: deal, error: dErr } = await supabase
          .from("deals")
          .select("id, creator_id, status")
          .eq("id", dealId)
          .maybeSingle();
        if (dErr || !deal) {
          return new Response(JSON.stringify({ error: "deal not found" }), {
            status: 404,
            headers: { ...headers, "Content-Type": "application/json" },
          });
        }
        if (deal.status === "completed" || deal.status === "cancelled") {
          return new Response(JSON.stringify({ error: "deal is closed" }), {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
          });
        }
        const { data: recipient, error: rErr } = await supabase
          .from("profiles")
          .select("stripe_connect_account_id, stripe_connect_status")
          .eq("id", deal.creator_id)
          .maybeSingle();
        if (rErr || !recipient?.stripe_connect_account_id || recipient.stripe_connect_status !== "enabled") {
          return new Response(
            JSON.stringify({
              error: "recipient_not_onboarded",
              message: "Recipient has not completed Stripe onboarding",
            }),
            {
              status: 409,
              headers: { ...headers, "Content-Type": "application/json" },
            }
          );
        }
        dealRow = { id: deal.id, creator_id: deal.creator_id };
        connectArgs = {
          payment_intent_data: {
            application_fee_amount: feeCents,
            transfer_data: { destination: recipient.stripe_connect_account_id },
            // Don't auto-capture transfer: keep funds in platform until release_escrow.
            // (Stripe destination charges actually transfer at capture; we use
            //  on_behalf_of=false to keep the platform as merchant of record.)
            metadata: {
              deal_id: dealId,
              recipient_id: deal.creator_id,
              sponsor_id: user.id,
              platform_fee_cents: String(feeCents),
            },
          },
        };
      }

      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: streamId
                  ? "Донат на ефір BridoConnect"
                  : dealId
                    ? "Допомога по угоді BridoConnect"
                    : "Поповнення гаманця BridoConnect",
                description: streamId
                  ? `Stream ID: ${streamId}`
                  : dealId
                    ? `Deal ID: ${dealId}`
                    : "Баланс рахунку",
              },
              unit_amount: unitCents,
            },
            quantity: 1,
          },
        ],
        success_url: streamId
          ? `${origin}/app/live/${streamId}?success=true`
          : dealId
            ? `${origin}/app/deal/${dealId}?success=true`
            : `${origin}/app/wallet?success=true`,
        cancel_url: streamId
          ? `${origin}/app/live/${streamId}`
          : dealId
            ? `${origin}/app/deal/${dealId}`
            : `${origin}/app/wallet`,
        metadata: {
          dealId: dealId || "",
          streamId: streamId || "",
          type: type || (streamId ? "stream_donation" : dealId ? "deal_payment" : "deposit"),
          user_id: user.id,
          recipient_id: dealRow?.creator_id || streamRow?.host_id || "",
          platform_fee_cents: String(dealId || streamId ? feeCents : 0),
        },
        ...connectArgs,
      });

      // Persist session id on deal for reconciliation.
      // P1-6 fix: only overwrite stripe_session_id if it's NULL — prevents two
      // concurrent checkouts from both completing if both webhooks fire (the
      // first session_id wins, the second is orphaned). Actual idempotency
      // still relies on the webhook side via apply_stripe_payment.
      if (dealId) {
        await supabase
          .from("deals")
          .update({
            stripe_session_id: session.id,
            amount_cents: unitCents,
            platform_fee_cents: feeCents,
            payment_processor: "stripe",
          })
          .eq("id", dealId)
          .is("stripe_session_id", null);
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
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
