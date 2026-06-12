import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// PayPal Partner Referrals — generate onboarding URL for recipient.
// Returns action_url; recipient lands on PayPal, completes KYC, gets merchant_id.
// MERCHANT.ONBOARDING.COMPLETED webhook then sets paypal_status='active'.

const PAYPAL_BASE =
  Deno.env.get("PAYPAL_ENV") === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

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

async function paypalAccessToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID") || "";
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
  const basic = btoa(`${id}:${secret}`);
  const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) throw new Error(`paypal token: ${resp.status}`);
  return (await resp.json()).access_token;
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
      .select("role, paypal_merchant_id, paypal_status, country")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "recipient") {
      return new Response(JSON.stringify({ error: "only recipients can onboard" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (profile?.paypal_status === "active") {
      return new Response(JSON.stringify({ url: null, status: "active" }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const reqOrigin = req.headers.get("origin");
    const origin =
      reqOrigin && ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : "https://bridoconnect.vercel.app";

    const token = await paypalAccessToken();

    const referral = await fetch(`${PAYPAL_BASE}/v2/customer/partner-referrals`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Partner-Attribution-Id": Deno.env.get("PAYPAL_BN_CODE") || "BRIDOCONNECT_SP",
      },
      body: JSON.stringify({
        tracking_id: user.id,
        partner_config_override: {
          return_url: `${origin}/app/profile?paypal=return`,
          return_url_description: "Return to BridoConnect",
        },
        operations: [
          {
            operation: "API_INTEGRATION",
            api_integration_preference: {
              rest_api_integration: {
                integration_method: "PAYPAL",
                integration_type: "THIRD_PARTY",
                third_party_details: {
                  features: ["PAYMENT", "REFUND", "PARTNER_FEE", "READ_SELLER_DISPUTE"],
                },
              },
            },
          },
        ],
        products: ["EXPRESS_CHECKOUT"],
        legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
      }),
    });
    if (!referral.ok) {
      const err = await referral.text();
      throw new Error(`paypal referrals: ${referral.status} ${err}`);
    }
    const json = await referral.json();
    const actionUrl = json.links?.find((l: { rel: string; href: string }) => l.rel === "action_url")?.href;

    await supabase
      .from("profiles")
      .update({
        paypal_status: "pending",
        paypal_updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return new Response(JSON.stringify({ url: actionUrl }), {
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
