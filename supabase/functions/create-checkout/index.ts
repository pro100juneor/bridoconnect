import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { deal_id, amount, currency = "eur", mode = "payment", price_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token || "");
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const origin = req.headers.get("origin") || "https://bridoconnect.vercel.app";

    let session;

    if (mode === "subscription" && price_id) {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: price_id, quantity: 1 }],
        success_url: `${origin}/app/premium?success=true`,
        cancel_url: `${origin}/app/premium`,
        metadata: { user_id: user.id },
      });
    } else {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency,
            product_data: { name: deal_id ? `Підтримка угоди #${deal_id}` : "Поповнення гаманця" },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }],
        success_url: deal_id ? `${origin}/app/deal/${deal_id}?payment=success` : `${origin}/app/wallet?payment=success`,
        cancel_url: deal_id ? `${origin}/app/deal/${deal_id}` : `${origin}/app/wallet`,
        metadata: { user_id: user.id, deal_id: deal_id || "" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
