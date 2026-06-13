import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sumsub KYC integration — creates an applicant if not exists, returns SDK
// access token for the WebSDK to render in browser. Frontend embeds via
// @sumsub/websdk-react. After verification, Sumsub webhook updates profile.

const SUMSUB_BASE = "https://api.sumsub.com";

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

async function hmacHex(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sumsubFetch(method: string, path: string, body?: string): Promise<Response> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const secret = Deno.env.get("SUMSUB_SECRET_KEY") || "";
  const sig = await hmacHex(secret, ts + method + path + (body || ""));
  return fetch(`${SUMSUB_BASE}${path}`, {
    method,
    headers: {
      "X-App-Token": Deno.env.get("SUMSUB_APP_TOKEN") || "",
      "X-App-Access-Sig": sig,
      "X-App-Access-Ts": ts,
      "Content-Type": "application/json",
    },
    body,
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

    const { level = "basic-kyc-level" } = await req.json().catch(() => ({}));

    // 1. Ensure applicant exists. externalUserId = profile.id.
    const checkPath = `/resources/applicants/-;externalUserId=${user.id}/one`;
    let applicantId: string | null = null;
    const checkResp = await sumsubFetch("GET", checkPath);
    if (checkResp.ok) {
      const j = await checkResp.json();
      applicantId = j.id;
    } else if (checkResp.status === 404) {
      const createBody = JSON.stringify({
        externalUserId: user.id,
        email: user.email,
        type: "individual",
      });
      const createResp = await sumsubFetch(
        "POST",
        `/resources/applicants?levelName=${encodeURIComponent(level)}`,
        createBody
      );
      if (!createResp.ok) {
        const err = await createResp.text();
        throw new Error(`sumsub create: ${createResp.status} ${err}`);
      }
      const j = await createResp.json();
      applicantId = j.id;
    } else {
      const err = await checkResp.text();
      throw new Error(`sumsub check: ${checkResp.status} ${err}`);
    }

    // 2. Get WebSDK access token.
    const tokenPath = `/resources/accessTokens?userId=${encodeURIComponent(user.id)}&levelName=${encodeURIComponent(level)}`;
    const tokenResp = await sumsubFetch("POST", tokenPath);
    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      throw new Error(`sumsub token: ${tokenResp.status} ${err}`);
    }
    const { token } = await tokenResp.json();

    return new Response(JSON.stringify({ applicantId, token, level }), {
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
