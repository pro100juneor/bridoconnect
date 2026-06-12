import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Wise Platform API — payout to local bank accounts in 50+ currencies / 80+ countries.
// Используется для recipients в странах где Stripe Connect недоступен:
// Vietnam, Pakistan, Bangladesh, Indonesia, большая часть Africa.
//
// Auth: Bearer токен из Wise Personal/Business account (API Tokens).
// Flow: create quote → create recipient → fund transfer (sponsor pays in EUR).
//
// В этой версии — minimal stub: создаёт quote + recipient + transfer.
// Funding отдельным шагом через /transfers/<id>/payments.

const WISE_BASE =
  Deno.env.get("WISE_ENV") === "live" ? "https://api.wise.com" : "https://api.sandbox.transferwise.tech";

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

async function wiseFetch(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${WISE_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${Deno.env.get("WISE_API_TOKEN") || ""}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
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

    const { dealId } = await req.json();
    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("id, creator_id, sponsor_id, amount_cents, platform_fee_cents, escrow_released_at")
      .eq("id", dealId)
      .maybeSingle();
    if (!deal) {
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

    const { data: recipient } = await supabase
      .from("profiles")
      .select("wise_recipient_id, country")
      .eq("id", deal.creator_id)
      .maybeSingle();
    if (!recipient?.wise_recipient_id) {
      return new Response(
        JSON.stringify({
          error: "recipient_not_onboarded",
          message: "Recipient has no Wise recipient profile",
        }),
        { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const profileId = Deno.env.get("WISE_PROFILE_ID") || "";
    const sourceCcy = "EUR";
    const targetCcy = "USD"; // TODO map recipient.country → target currency
    const netCents = (deal.amount_cents || 0) - (deal.platform_fee_cents || 0);
    const netEur = netCents / 100;

    // 1. Quote.
    const quoteResp = await wiseFetch("POST", `/v3/profiles/${profileId}/quotes`, {
      sourceCurrency: sourceCcy,
      targetCurrency: targetCcy,
      sourceAmount: netEur,
      payOut: "BANK_TRANSFER",
    });
    if (!quoteResp.ok) {
      const err = await quoteResp.text();
      throw new Error(`wise quote: ${quoteResp.status} ${err}`);
    }
    const quote = await quoteResp.json();

    // 2. Transfer.
    const transferResp = await wiseFetch("POST", "/v1/transfers", {
      targetAccount: recipient.wise_recipient_id,
      quoteUuid: quote.id,
      customerTransactionId: crypto.randomUUID(),
      details: {
        reference: `Brido ${dealId.slice(0, 8)}`,
        transferPurpose: "verification.transfers.purpose.charity_donation",
        sourceOfFunds: "verification.source.of.funds.other",
      },
    });
    if (!transferResp.ok) {
      const err = await transferResp.text();
      throw new Error(`wise transfer: ${transferResp.status} ${err}`);
    }
    const transfer = await transferResp.json();

    await supabase
      .from("deals")
      .update({
        wise_transfer_id: transfer.id?.toString(),
        stripe_transfer_id: transfer.id?.toString(), // generic transfer ref
      })
      .eq("id", dealId);

    return new Response(
      JSON.stringify({
        transferId: transfer.id,
        rate: quote.rate,
        fee: quote.fee,
        targetAmount: transfer.targetValue,
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
