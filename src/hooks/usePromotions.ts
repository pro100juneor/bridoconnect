import { supabase } from "@/integrations/supabase/client";

// The Supabase client is created without a Database generic, so `.from()` / `.rpc()`
// on the new `promotions` table need `as any` casts (same pattern as
// useShopProfile / useRecipientPage / useCurrency). One shared `from` helper keeps
// per-line `as any` to a minimum.
const from = (table: string) => (supabase as any).from(table);

async function safeJsonError(resp: Response, fallback: string): Promise<string> {
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const j = await resp.json();
      return j.message || j.error || fallback;
    } catch {
      // fall through
    }
  }
  try {
    const text = await resp.text();
    return text.slice(0, 200) || fallback;
  } catch {
    return fallback;
  }
}

export type PromotionAudience = "sponsor" | "recipient";
export type PromotionStatus = "pending" | "active" | "expired" | "cancelled";

export interface Promotion {
  id: string;
  user_id: string;
  audience: PromotionAudience;
  photo_url: string | null;
  headline: string | null;
  body: string | null;
  amount_cents: number;
  tier: number;
  status: PromotionStatus;
  priority: number;
  stripe_session_id: string | null;
  activated_at: string | null;
  starts_at: string | null;
  expires_at: string | null;
  min_visible_until: string | null;
  created_at: string;
}

// Promotion enriched with the promoted profile's display fields (joined in JS,
// since promotions.user_id -> profiles is fetched separately).
export interface PromotedProfile extends Promotion {
  name: string;
  avatar_url: string | null;
  country: string | null;
  city: string | null;
  slug: string | null;
  role: string | null;
}

function normalizePromotion(row: any): Promotion {
  return {
    id: row.id,
    user_id: row.user_id,
    audience: row.audience,
    photo_url: row.photo_url ?? null,
    headline: row.headline ?? null,
    body: row.body ?? null,
    amount_cents: Number(row.amount_cents) || 0,
    tier: Number(row.tier) || 1,
    status: row.status,
    priority: Number(row.priority) || 0,
    stripe_session_id: row.stripe_session_id ?? null,
    activated_at: row.activated_at ?? null,
    starts_at: row.starts_at ?? null,
    expires_at: row.expires_at ?? null,
    min_visible_until: row.min_visible_until ?? null,
    created_at: row.created_at,
  };
}

export const usePromotions = () => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  // Current user's role — drives which audience feed they see.
  const getMyRole = async (): Promise<{ userId: string; role: PromotionAudience } | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = (data as any)?.role;
    // admin (or anything unexpected) falls back to seeing the recipient feed.
    const audience: PromotionAudience = role === "recipient" ? "recipient" : "sponsor";
    return { userId: user.id, role: audience };
  };

  // Active promos for the current viewer, already ranked by the DB (the >=3-min
  // guarantee is enforced server-side via active_promotions ordering). Each promo
  // is enriched with the promoted profile's name/avatar/slug for display.
  const listForViewer = async (): Promise<PromotedProfile[]> => {
    const me = await getMyRole();
    if (!me) return [];
    const { data, error } = await (supabase as any).rpc("active_promotions", {
      p_audience: me.role,
    });
    if (error || !data) return [];
    const promos = (data as any[]).map(normalizePromotion);
    if (promos.length === 0) return [];

    const ids = Array.from(new Set(promos.map((p) => p.user_id)));
    const { data: profs } = await from("profiles")
      .select("id, name, avatar_url, country, city, slug, role")
      .in("id", ids);
    const map = new Map<string, any>((profs || []).map((p: any) => [p.id, p]));

    return promos.map((p) => {
      const prof = map.get(p.user_id) || {};
      return {
        ...p,
        name: prof.name ?? "Користувач",
        avatar_url: prof.avatar_url ?? null,
        country: prof.country ?? null,
        city: prof.city ?? null,
        slug: prof.slug ?? null,
        role: prof.role ?? null,
      };
    });
  };

  // The caller's own promotions (any status), newest first.
  const myPromotions = async (): Promise<Promotion[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await from("promotions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as any[]).map(normalizePromotion);
  };

  // Start a paid promotion: create-checkout inserts the pending row + returns a
  // Stripe Checkout URL, we redirect. Webhook activates it after payment.
  const startPromotion = async (opts: {
    tier: 1 | 2 | 3;
    headline?: string;
    body?: string;
    photoUrl?: string;
    durationHours?: number;
  }): Promise<void> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ type: "promotion", promotion: opts }),
    });
    if (!resp.ok) throw new Error(await safeJsonError(resp, "Не вдалося створити оплату"));
    const { url } = await resp.json();
    if (url) window.location.href = url;
  };

  return { listForViewer, myPromotions, startPromotion, getMyRole };
};
