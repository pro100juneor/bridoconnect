// Shared PayPal REST helpers (sandbox by default; set PAYPAL_ENV=live for prod).
export const PAYPAL_BASE =
  Deno.env.get("PAYPAL_ENV") === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export async function paypalAccessToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID") || "";
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
  const basic = btoa(`${id}:${secret}`);
  const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) throw new Error(`paypal token: ${resp.status}`);
  const json = await resp.json();
  return json.access_token as string;
}
