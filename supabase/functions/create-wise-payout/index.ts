import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getPaymentAccounts } from "../_shared/payment-accounts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Wise Platform API — payout to local bank accounts in 50+ currencies / 80+ countries.
// Используется для recipients в странах где Stripe Connect недоступен:
// Vietnam, Pakistan, Bangladesh, Indonesia, большая часть Africa.
//
// Auth: Bearer токен из Wise Personal/Business account (API Tokens).
// Flow: quote → transfer → FUND from platform Wise balance
//   (POST /v3/profiles/{profileId}/transfers/{transferId}/payments { type: BALANCE }).
// Рельс реализован полностью, но gated OFF в UI до проверки на Wise sandbox.

const WISE_BASE =
  Deno.env.get("WISE_ENV") === "live" ? "https://api.wise.com" : "https://api.sandbox.transferwise.tech";

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

    // Аудит 13.09: выплата возможна только после подтверждения релиза эскроу,
    // и ровно один раз (claim через уникальный event id в transactions).
    if (!deal.escrow_released_at) {
      return new Response(JSON.stringify({ error: "escrow not released yet" }), {
        status: 409,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    const recipient = await getPaymentAccounts(supabase, deal.creator_id);
    if (!recipient.wise_recipient_id) {
      return new Response(
        JSON.stringify({
          error: "recipient_not_onboarded",
          message: "Recipient has no Wise recipient profile",
        }),
        { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Idempotency claim (one payout per deal), inserted AFTER cheap validations so
    // a validation failure does not block a later retry.
    const { error: claimErr } = await supabase.from("transactions").insert({
      processor: "wise",
      stripe_event_id: `wise-payout::${dealId}`,
      user_id: deal.creator_id,
      deal_id: dealId,
      amount: ((deal.amount_cents || 0) - (deal.platform_fee_cents || 0)) / 100,
      amount_cents: (deal.amount_cents || 0) - (deal.platform_fee_cents || 0),
      type: "wise_payout",
      status: "initiated",
    });
    if (claimErr) {
      return new Response(JSON.stringify({ error: "payout already initiated", detail: claimErr.code }), {
        status: 409,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    const rollbackClaim = async () => {
      await supabase.from("transactions").delete().eq("stripe_event_id", `wise-payout::${dealId}`);
    };

    try {
      const profileId = Deno.env.get("WISE_PROFILE_ID") || "";
      const sourceCcy = "EUR";
      // Валюта выплаты берётся из самого Wise-recipient-аккаунта.
      let targetCcy = "USD";
      const acctResp = await wiseFetch("GET", `/v1/accounts/${recipient.wise_recipient_id}`);
      if (acctResp.ok) {
        const acct = await acctResp.json();
        if (typeof acct?.currency === "string" && /^[A-Z]{3}$/.test(acct.currency)) {
          targetCcy = acct.currency;
        }
      }
      const netEur = ((deal.amount_cents || 0) - (deal.platform_fee_cents || 0)) / 100;

      // 1. Quote.
      const quoteResp = await wiseFetch("POST", `/v3/profiles/${profileId}/quotes`, {
        sourceCurrency: sourceCcy,
        targetCurrency: targetCcy,
        sourceAmount: netEur,
        payOut: "BANK_TRANSFER",
      });
      if (!quoteResp.ok) throw new Error(`wise quote: ${quoteResp.status}`);
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
      if (!transferResp.ok) throw new Error(`wise transfer: ${transferResp.status}`);
      const transfer = await transferResp.json();

      // 3. Fund the transfer from the platform Wise balance. WITHOUT this the
      // transfer is created but never paid out (this was the C-3 stub).
      // POST /v3/profiles/{profileId}/transfers/{transferId}/payments { type: BALANCE }
      const fundResp = await wiseFetch(
        "POST",
        `/v3/profiles/${profileId}/transfers/${transfer.id}/payments`,
        { type: "BALANCE" }
      );
      const funding = await fundResp.json().catch(() => ({}));
      if (!fundResp.ok || funding?.status !== "COMPLETED") {
        console.error("wise funding not completed", fundResp.status, funding?.status, funding?.errorCode);
        // Note: the (unfunded) transfer already exists at Wise and should be
        // reconciled/cancelled out-of-band; rolling back the claim allows retry.
        throw new Error("wise funding not completed");
      }

      await supabase
        .from("deals")
        .update({
          wise_transfer_id: transfer.id?.toString(),
          stripe_transfer_id: transfer.id?.toString(), // generic transfer ref
        })
        .eq("id", dealId);
      await supabase
        .from("transactions")
        .update({ status: "completed" })
        .eq("stripe_event_id", `wise-payout::${dealId}`);

      return new Response(
        JSON.stringify({
          transferId: transfer.id,
          rate: quote.rate,
          fee: quote.fee,
          targetAmount: transfer.targetValue,
        }),
        { headers: { ...headers, "Content-Type": "application/json" } }
      );
    } catch (e) {
      await rollbackClaim();
      console.error("wise payout failed", e instanceof Error ? e.message : e);
      return new Response(JSON.stringify({ error: "wise payout failed" }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
