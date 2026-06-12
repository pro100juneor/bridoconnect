import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sanctions screening — production should call ComplyAdvantage or Refinitiv
// World-Check. This function provides the integration shell + an offline
// fallback that matches against a small built-in OFAC list. Replace the
// `screenExternal` call with the real provider when API keys are provisioned.

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

// Minimal offline fallback. NOT a substitute for ComplyAdvantage in prod.
const SANCTIONED_COUNTRY_ISO2 = new Set(["RU", "BY", "IR", "KP", "SY", "CU"]);
const SANCTIONED_NAME_FRAGMENTS = ["putin", "lukashenko", "khamenei", "kim jong"];

type ScreenResult = {
  result: "clear" | "review" | "blocked";
  matched: Array<{ list: string; reason: string }>;
  risk_score: number;
};

async function screenExternal(name: string, country: string | null): Promise<ScreenResult> {
  const apiKey = Deno.env.get("COMPLYADVANTAGE_API_KEY");
  if (apiKey) {
    const resp = await fetch("https://api.complyadvantage.com/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Token ${apiKey}` },
      body: JSON.stringify({
        search_term: name,
        client_ref: `screen-${Date.now()}`,
        fuzziness: 0.6,
        filters: { types: ["sanction", "warning", "pep"] },
      }),
    });
    if (resp.ok) {
      const json = await resp.json();
      const hits = json?.content?.data?.hits || [];
      const matched = hits.map((h: { name: string; types: string[] }) => ({
        list: (h.types || []).join(","),
        reason: h.name,
      }));
      const score = Math.min(matched.length * 30, 100);
      const result = score >= 60 ? "blocked" : score >= 20 ? "review" : "clear";
      return { result, matched, risk_score: score };
    }
  }
  // Offline fallback.
  const matched: ScreenResult["matched"] = [];
  if (country && SANCTIONED_COUNTRY_ISO2.has(country.toUpperCase())) {
    matched.push({ list: "country_block", reason: `sanctioned jurisdiction ${country}` });
  }
  const lower = name.toLowerCase();
  for (const frag of SANCTIONED_NAME_FRAGMENTS) {
    if (lower.includes(frag)) {
      matched.push({ list: "offline_ofac", reason: `name matches "${frag}"` });
    }
  }
  const score = matched.length === 0 ? 0 : matched.length >= 2 ? 80 : 40;
  const result: ScreenResult["result"] = score >= 60 ? "blocked" : score >= 20 ? "review" : "clear";
  return { result, matched, risk_score: score };
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

    const { userId: targetId, context } = await req.json();
    const screenedId = targetId || user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, country, stripe_connect_country")
      .eq("id", screenedId)
      .maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: "profile not found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const isoCountry =
      profile.stripe_connect_country ||
      (profile.country && /^[A-Z]{2}$/.test(profile.country) ? profile.country : null);

    const screen = await screenExternal(profile.name, isoCountry);

    await supabase.from("sanctions_screening_log").insert({
      user_id: screenedId,
      context: context || "manual",
      lists_checked: ["complyadvantage_or_offline", "country_block"],
      matched_entries: screen.matched,
      risk_score: screen.risk_score,
      result: screen.result,
    });

    return new Response(JSON.stringify(screen), {
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
