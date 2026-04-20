import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { amount, dealId, type, priceId } = await req.json();
    const origin = req.headers.get("origin") || "https://bridoconnect.vercel.app";

    let session;

    if (type === "subscription" && priceId) {
      // Premium subscription
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/app/premium?success=true`,
        cancel_url: `${origin}/app/premium`,
        metadata: { type: "subscription" },
      });
    } else {
      // One-time payment (wallet deposit or deal payment)
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: dealId ? "Допомога по угоді BridoConnect" : "Поповнення гаманця BridoConnect",
              description: dealId ? `Deal ID: ${dealId}` : "Баланс рахунку",
            },
            unit_amount: Math.round((amount || 50) * 100),
          },
          quantity: 1,
        }],
        success_url: `${origin}/app/wallet?success=true`,
        cancel_url: `${origin}/app/wallet`,
        metadata: { dealId: dealId || "", type: type || "deposit" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
