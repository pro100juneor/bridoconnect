import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { getStripeConnect } from "../_shared/payment-accounts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit, rateLimitHeaders, clientKey } from "../_shared/rate-limit.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const ALLOWED_ORIGINS = new Set([
  "https://bridoconnect.vercel.app",
  "capacitor://localhost",
  "https://localhost",
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

// Resolve a display/checkout currency against the currency_rates whitelist.
// Base prices are stored in EUR; we convert to `target minor units` = round(eur * rate).
// NOTE: rates are static rows — production needs a live FX feed refreshing this table.
async function resolveCurrency(
  supabase: ReturnType<typeof createClient>,
  currency: unknown
): Promise<{ code: string; rate: number } | null> {
  const code = String(currency || "eur").toLowerCase();
  if (code === "eur") return { code: "eur", rate: 1 };
  const { data } = await supabase
    .from("currency_rates")
    .select("rate_per_eur")
    .eq("code", code)
    .maybeSingle();
  if (!data) return null; // not in whitelist
  return { code, rate: Number((data as { rate_per_eur: number }).rate_per_eur) };
}

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

    const { amount, dealId, streamId, productId, productIds, currency, type, priceId, promotion } =
      await req.json();

    if (
      type !== undefined &&
      ![
        "subscription",
        "deposit",
        "deal_payment",
        "deal",
        "stream_donation",
        "product_purchase",
        "cart_purchase",
        "promotion",
      ].includes(type)
    ) {
      return new Response(JSON.stringify({ error: "invalid type" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const reqOrigin = req.headers.get("origin");
    // Stripe redirect target must be a browsable https URL. Native shells send
    // `capacitor://localhost` / `https://localhost` (fine for CORS, unusable as a
    // redirect), so fall back to the web app URL for those.
    const webFallback = Deno.env.get("APP_URL") || "https://bridoconnect.vercel.app";
    const isBrowsable = !!reqOrigin && /^https?:\/\//.test(reqOrigin) && !/\/\/localhost/.test(reqOrigin);
    const origin = isBrowsable && ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : webFallback;

    let session;

    if (type === "promotion") {
      // Paid promo placement — платформенный доход, БЕЗ Connect destination/fee.
      // Роль текущего пользователя определяет аудиторию: продвигаемого видит
      // противоположная роль (recipient продвигается спонсорам, и наоборот).
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profErr || !prof) {
        return new Response(JSON.stringify({ error: "profile not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      const role = (prof as { role: string }).role;
      const audience = role === "recipient" ? "sponsor" : "recipient";

      const promo = (promotion || {}) as {
        tier?: number;
        headline?: string;
        body?: string;
        photoUrl?: string;
        durationHours?: number;
      };
      const tier = [1, 2, 3].includes(Number(promo.tier)) ? Number(promo.tier) : 1;
      // Прайс по уровню (EUR minor units) + дефолтная длительность.
      const TIER_PRICE: Record<number, number> = { 1: 500, 2: 1500, 3: 5000 };
      const TIER_HOURS: Record<number, number> = { 1: 24, 2: 72, 3: 168 };
      const price = TIER_PRICE[tier];
      // Аудит 13.09: durationHours из клиента позволял купить Tier 1 на 30 дней.
      const durationHours = TIER_HOURS[tier];

      // Pending row (service role) — клиент никогда не пишет promotions напрямую.
      const { data: promoRow, error: insErr } = await supabase
        .from("promotions")
        .insert({
          user_id: user.id,
          audience,
          photo_url: promo.photoUrl || null,
          headline: promo.headline || null,
          body: promo.body || null,
          amount_cents: price,
          tier,
          priority: price,
          status: "pending",
        })
        .select("id")
        .single();
      if (insErr || !promoRow) {
        return new Response(JSON.stringify({ error: "promotion create failed" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `Просування у стрічці BridoConnect (Tier ${tier})`,
                description: "Платне розміщення у промо-стрічці",
              },
              unit_amount: price,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/app?promo=success`,
        cancel_url: `${origin}/app`,
        metadata: {
          type: "promotion",
          promotionId: (promoRow as { id: string }).id,
          user_id: user.id,
          durationHours: String(durationHours),
        },
      });

      // Persist session id for reconciliation (only if not already set).
      await supabase
        .from("promotions")
        .update({ stripe_session_id: session.id })
        .eq("id", (promoRow as { id: string }).id)
        .is("stripe_session_id", null);
    } else if (type === "subscription" && priceId) {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/app/premium?success=true`,
        cancel_url: `${origin}/app/premium`,
        metadata: { type: "subscription", user_id: user.id },
      });
    } else if (Array.isArray(productIds) && productIds.length > 0) {
      // Cart purchase: several positions, all from ONE seller (a single Connect
      // destination charge). Amounts come from DB prices, never the client body.
      const cur = await resolveCurrency(supabase, currency);
      if (!cur) {
        return new Response(JSON.stringify({ error: "invalid currency" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, seller_id, title, price_cents, stock, status")
        .in("id", productIds);
      if (pErr || !products || products.length !== productIds.length) {
        return new Response(JSON.stringify({ error: "product not found" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      if (products.some((p) => p.status !== "active" || p.stock <= 0)) {
        return new Response(JSON.stringify({ error: "product unavailable" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      const sellerIds = new Set(products.map((p) => p.seller_id));
      if (sellerIds.size !== 1) {
        return new Response(JSON.stringify({ error: "mixed sellers" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      const sellerId = products[0].seller_id;

      const seller = await getStripeConnect(supabase, sellerId);
      if (!seller.stripe_connect_account_id || seller.stripe_connect_status !== "enabled") {
        return new Response(
          JSON.stringify({
            error: "recipient_not_onboarded",
            message: "Seller has not completed Stripe onboarding",
          }),
          { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }

      // Резервируем каждую позицию ДО создания сессии: сток списывается здесь,
      // а не в вебхуке, иначе двое покупателей успевали оплатить последний
      // экземпляр. Если хоть одна позиция не зарезервировалась — откатываем всё.
      const reservationIds: string[] = [];
      for (const p of products) {
        const { data: rid } = await supabase.rpc("reserve_stock", {
          p_product_id: p.id,
          p_buyer_id: user.id,
          p_ttl_minutes: 30,
        });
        if (!rid) {
          for (const done of reservationIds) {
            await supabase.rpc("release_reservation", { p_reservation_id: done });
          }
          return new Response(
            JSON.stringify({ error: "product unavailable", productId: p.id }),
            { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
          );
        }
        reservationIds.push(rid as string);
      }
      const releaseAll = async () => {
        for (const rid of reservationIds) {
          await supabase.rpc("release_reservation", { p_reservation_id: rid });
        }
      };

      const line_items = products.map((p) => ({
        price_data: {
          currency: cur.code,
          product_data: { name: p.title, description: `Товар BridoConnect` },
          unit_amount: Math.round(p.price_cents * cur.rate),
        },
        quantity: 1,
      }));
      const totalCents = products.reduce((s, p) => s + Math.round(p.price_cents * cur.rate), 0);
      const feeCents = Math.round((totalCents * PLATFORM_FEE_BPS) / 10_000);
      const idsJson = JSON.stringify(products.map((p) => p.id));

      try {
        session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${origin}/app/shop?success=true`,
        cancel_url: `${origin}/app/cart`,
        metadata: {
          productIds: idsJson,
          seller_id: sellerId,
          type: "cart_purchase",
          user_id: user.id,
          recipient_id: sellerId,
          currency: cur.code,
          platform_fee_cents: String(feeCents),
          reservationIds: JSON.stringify(reservationIds),
        },
        payment_intent_data: {
          application_fee_amount: feeCents,
          transfer_data: { destination: seller.stripe_connect_account_id },
          metadata: {
            productIds: idsJson,
            seller_id: sellerId,
            buyer_id: user.id,
            platform_fee_cents: String(feeCents),
          },
        },
        });
      } catch (e) {
        // Сессия не создалась — резерв держать не за что, возвращаем товар.
        await releaseAll();
        throw e;
      }
      await supabase
        .from("product_reservations")
        .update({ stripe_session_id: session.id })
        .in("id", reservationIds);
    } else if (productId) {
      // Product purchase: amount comes from the product's DB price (never the
      // client body) — this prevents a caller from paying an arbitrary amount.
      const cur = await resolveCurrency(supabase, currency);
      if (!cur) {
        return new Response(JSON.stringify({ error: "invalid currency" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

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

      const seller = await getStripeConnect(supabase, product.seller_id);
      if (!seller.stripe_connect_account_id || seller.stripe_connect_status !== "enabled") {
        return new Response(
          JSON.stringify({
            error: "recipient_not_onboarded",
            message: "Seller has not completed Stripe onboarding",
          }),
          { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
        );
      }

      const unitCents = Math.round(product.price_cents * cur.rate);
      const feeCents = Math.round((unitCents * PLATFORM_FEE_BPS) / 10_000);

      // Резервация до оплаты — защита от продажи одного экземпляра дважды.
      const { data: reservationId } = await supabase.rpc("reserve_stock", {
        p_product_id: productId,
        p_buyer_id: user.id,
        p_ttl_minutes: 30,
      });
      if (!reservationId) {
        return new Response(JSON.stringify({ error: "product unavailable" }), {
          status: 409,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      try {
        session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: cur.code,
                product_data: {
                  name: product.title,
                  description: `Товар BridoConnect`,
                },
                unit_amount: unitCents,
              },
              quantity: 1,
            },
          ],
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
          success_url: `${origin}/app/shop/${productId}?success=true`,
          cancel_url: `${origin}/app/shop/${productId}`,
          metadata: {
            productId,
            seller_id: product.seller_id,
            type: "product_purchase",
            user_id: user.id,
            recipient_id: product.seller_id,
            currency: cur.code,
            platform_fee_cents: String(feeCents),
            reservationIds: JSON.stringify([reservationId]),
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
      } catch (e) {
        await supabase.rpc("release_reservation", { p_reservation_id: reservationId });
        throw e;
      }
      await supabase
        .from("product_reservations")
        .update({ stripe_session_id: session.id })
        .eq("id", reservationId);
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
        const host = await getStripeConnect(supabase, stream.host_id);
        if (!host.stripe_connect_account_id || host.stripe_connect_status !== "enabled") {
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
        const recipient = await getStripeConnect(supabase, deal.creator_id);
        if (!recipient.stripe_connect_account_id || recipient.stripe_connect_status !== "enabled") {
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
        // НАСТОЯЩИЙ ЭСКРОУ (separate charges & transfers): деньги остаются на
        // балансе платформы до release-escrow, и только тогда уходят получателю
        // отдельным transfer'ом. Раньше здесь был destination charge — средства
        // доставались получателю сразу при capture, и «релиз» был лишь пометкой
        // в БД. Проверку онбординга оставляем здесь: бессмысленно принимать
        // деньги, если потом их некому будет перевести.
        // transfer_group связывает charge и будущий transfer в отчётности Stripe.
        connectArgs = {
          payment_intent_data: {
            transfer_group: `deal_${dealId}`,
            metadata: {
              deal_id: dealId,
              recipient_id: deal.creator_id,
              sponsor_id: user.id,
              platform_fee_cents: String(feeCents),
              escrow: "separate_transfer",
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
