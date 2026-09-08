import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Stripe Identity: створює VerificationSession і повертає hosted URL.
// Документ + selfie завантажуються напряму в Stripe — наш бекенд сирих
// KYC-даних не бачить і не зберігає (docs/SECURE_KYC_STORAGE.md).

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
      .select("verification_status, identity_verification_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.verification_status === "verified") {
      return new Response(JSON.stringify({ error: "already verified" }), {
        status: 409,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { returnUrl } = await req.json().catch(() => ({ returnUrl: undefined }));
    const safeReturn =
      typeof returnUrl === "string" && returnUrl.startsWith("https://bridoconnect.vercel.app/")
        ? returnUrl
        : "https://bridoconnect.vercel.app/verification?done=1";

    // Незавершену сесію перевикористовуємо, щоб не плодити перевірки (кожна платна).
    if (profile?.identity_verification_id) {
      try {
        const prev = await stripe.identity.verificationSessions.retrieve(profile.identity_verification_id);
        if (prev.status === "requires_input" && prev.url) {
          return new Response(JSON.stringify({ url: prev.url, sessionId: prev.id }), {
            headers: { ...headers, "Content-Type": "application/json" },
          });
        }
      } catch {
        // сесія протухла — створюємо нову
      }
    }

    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { user_id: user.id },
      options: {
        document: {
          require_matching_selfie: true,
          require_live_capture: true,
        },
      },
      return_url: safeReturn,
    });

    await supabase
      .from("profiles")
      .update({ identity_verification_id: session.id, verification_status: "pending" })
      .eq("id", user.id);

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "identity session error";
    console.error("create-identity-session:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
