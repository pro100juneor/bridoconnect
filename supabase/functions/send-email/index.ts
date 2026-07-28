import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit, rateLimitHeaders, clientKey } from "../_shared/rate-limit.ts";
import { sendTransactionalEmail, type Template } from "../_shared/email.ts";

// Resend-backed email sender для BridoConnect.
// Templates выбираются по `template` полю: deal_created, payment_received,
// escrow_released, dispute_opened, kyc_approved, welcome.
// Все транзакционные письма проходят через эту функцию — единая точка логирования.
// Рендер шаблонов и вызов Resend вынесены в ../_shared/email.ts.

const ALLOWED_ORIGINS = new Set([
  "https://bridoconnect.com",
  "https://www.bridoconnect.com",
  "https://bridoconnect.vercel.app",
  "capacitor://localhost",
  "https://localhost",
  "http://localhost:5173",
  "http://localhost:8080",
]);

function corsFor(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://bridoconnect.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    Vary: "Origin",
  };
}

interface Payload {
  to: string;
  template: Template;
  locale?: "uk" | "en" | "de" | "ru" | "pl";
  vars?: Record<string, string | number>;
}

serve(async (req) => {
  const headers = corsFor(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers });

  // Rate limit: 20 писем / 5 min per IP
  const rl = await rateLimit({ key: clientKey(req, "send-email"), limit: 20, windowSec: 300 });
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
    // Публичный триггер — password_reset — не требует user; остальные требуют
    const body = (await req.json()) as Payload;
    if (!body.to || !body.template) {
      return new Response(JSON.stringify({ error: "to + template required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (body.template !== "password_reset" && !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const locale = body.locale ?? "uk";
    const result = await sendTransactionalEmail({
      to: body.to,
      template: body.template,
      locale,
      vars: body.vars,
      userId: user?.id ?? null,
      supabase,
    });

    // Нет ключа Resend — сервис не настроен (как раньше: 503).
    if (result.skipped) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 503,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (!result.ok) {
      return new Response(JSON.stringify({ error: "resend_failed", detail: result.error }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...headers, ...rateLimitHeaders(rl), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-email error", err);
    return new Response(JSON.stringify({ error: "internal", detail: String(err) }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
