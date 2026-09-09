import { supabase } from "@/integrations/supabase/client";
import type {
  ShopProfile,
  ShopBrand,
  ShopContacts,
  ShopMessengers,
  ShopBlocksConfig,
} from "@/storefront/types";

// The Supabase client is created without a Database generic, so `.from()` accepts
// any table name (same pattern as useProducts / useCurrency). One shared helper
// keeps the untyped access in one place.
const table = () => supabase.from("shop_profiles");

// Raw `shop_profiles` row (numbers may arrive as strings from the API).
interface ShopProfileRow {
  seller_id: string;
  slug: string;
  theme_id?: number | string | null;
  logo_url?: string | null;
  brand?: ShopBrand | null;
  contacts?: ShopContacts | null;
  messengers?: ShopMessengers | null;
  blocks?: ShopBlocksConfig | null;
  published?: boolean | null;
  created_at: string;
  updated_at: string;
}

function normalize(row: ShopProfileRow): ShopProfile {
  return {
    seller_id: row.seller_id,
    slug: row.slug,
    theme_id: Number(row.theme_id) || 1,
    logo_url: row.logo_url ?? null,
    brand: row.brand ?? ({} as ShopBrand),
    contacts: row.contacts ?? ({} as ShopContacts),
    messengers: row.messengers ?? ({} as ShopMessengers),
    blocks: row.blocks ?? ({} as ShopBlocksConfig),
    published: row.published ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export interface ShopProfilePatch {
  theme_id?: number;
  logo_url?: string | null;
  brand?: ShopBrand;
  contacts?: ShopContacts;
  messengers?: ShopMessengers;
  blocks?: ShopBlocksConfig;
  published?: boolean;
}

export const useShopProfile = () => {
  const getBySlug = async (slug: string): Promise<ShopProfile | null> => {
    const { data, error } = await table().select("*").eq("slug", slug).maybeSingle();
    if (error || !data) return null;
    return normalize(data);
  };

  const getMine = async (): Promise<ShopProfile | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await table().select("*").eq("seller_id", user.id).maybeSingle();
    if (error || !data) return null;
    return normalize(data);
  };

  // Insert (first time) or update the caller's storefront. On first save a slug
  // is generated from the profile name via the generate_shop_slug RPC.
  const upsert = async (patch: ShopProfilePatch): Promise<{ data?: ShopProfile; error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const existing = await getMine();

    if (existing) {
      const { data, error } = await table()
        .update({ ...patch })
        .eq("seller_id", user.id)
        .select("*")
        .single();
      if (error || !data) return { error: error?.message || "update failed" };
      return { data: normalize(data) };
    }

    // First-time: derive a base name and a unique slug.
    const { data: prof } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    const baseName = patch.brand?.name || (prof as { name?: string | null } | null)?.name || "shop";

    let slug: string;
    const { data: rpcSlug, error: rpcError } = await supabase.rpc("generate_shop_slug", {
      p_base: baseName,
    });
    if (!rpcError && rpcSlug) {
      slug = rpcSlug as string;
    } else {
      // Fallback if the RPC is unavailable: best-effort client-side slug.
      slug =
        (baseName as string)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-+)|(-+$)/g, "")
          .slice(0, 48) || `shop-${user.id.slice(0, 8)}`;
    }

    const insertRow = {
      seller_id: user.id,
      slug,
      theme_id: patch.theme_id ?? 1,
      logo_url: patch.logo_url ?? null,
      brand: patch.brand ?? {},
      contacts: patch.contacts ?? {},
      messengers: patch.messengers ?? {},
      blocks: patch.blocks ?? {},
      published: patch.published ?? true,
    };

    const { data, error } = await table().insert(insertRow).select("*").single();
    if (error || !data) return { error: error?.message || "insert failed" };
    return { data: normalize(data) };
  };

  // Upload a logo into shop-logos/<uid>/logo.<ext> and return its public URL.
  const uploadLogo = async (file: File): Promise<{ url?: string; error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${user.id}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("shop-logos")
      .upload(path, file, { upsert: true });
    if (uploadError) return { error: uploadError.message };
    const {
      data: { publicUrl },
    } = supabase.storage.from("shop-logos").getPublicUrl(path);
    // Cache-bust so a re-uploaded logo shows immediately.
    return { url: `${publicUrl}?v=${Date.now()}` };
  };

  return { getBySlug, getMine, upsert, uploadLogo };
};
