import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Повне видалення акаунту (App Review guideline 5.1.1(v)).
// Користувач підтверджує в застосунку → тут видаляємо auth-користувача;
// profiles і особисті дані йдуть каскадом, фінансові записи знеособлюються
// (миграція 033). Дія незворотна.

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

    const { confirm } = await req.json().catch(() => ({ confirm: undefined }));
    if (confirm !== "DELETE") {
      return new Response(JSON.stringify({ error: "confirmation required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Активні кошти на угодах — блокуємо видалення, щоб не втратити ескроу.
    const { count: activeDeals } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .or(`creator_id.eq.${user.id},sponsor_id.eq.${user.id}`)
      .in("status", ["active", "disputed"]);
    if ((activeDeals ?? 0) > 0) {
      return new Response(
        JSON.stringify({
          error: "active_deals",
          message: "Завершіть або скасуйте активні угоди перед видаленням акаунту.",
        }),
        { status: 409, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return new Response(JSON.stringify({ deleted: true }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "delete error";
    console.error("delete-account:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
