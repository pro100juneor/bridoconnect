import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// LiveKit token generation using JWT
async function createLiveKitToken(roomName: string, participantName: string, isHost: boolean, apiKey: string, apiSecret: string) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 6 * 60 * 60; // 6 hours

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    exp,
    iss: apiKey,
    sub: participantName,
    nbf: now,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const data = `${encode(header)}.${encode(payload)}`;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(apiSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${data}.${sigB64}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { room_name, is_host } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

    const authHeader = req.headers.get("Authorization");
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace("Bearer ", "") || "");
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
    const participantName = (profile as any)?.name || user.email || user.id;

    const apiKey = Deno.env.get("LIVEKIT_API_KEY") || "";
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET") || "";
    const wsUrl = Deno.env.get("LIVEKIT_WS_URL") || "";

    const token = await createLiveKitToken(room_name, participantName, is_host, apiKey, apiSecret);

    return new Response(JSON.stringify({ token, ws_url: wsUrl, room_name, participant_name: participantName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
