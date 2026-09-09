import { supabase } from "@/integrations/supabase/client";

// The Supabase client is created without a Database generic, so `.from()` accepts
// any table name (same pattern as useShopProfile / useProducts / useCurrency).
// One shared helper keeps the untyped access in one place.
const from = (table: string) => supabase.from(table);

// Section -> visible map for the public page. A MISSING key means visible
// (default-on), so an empty object shows every section.
export type FieldVisibility = Record<string, boolean>;
export type VerificationStatus = "unverified" | "pending" | "verified";

// Sections the owner can toggle on their public page.
export const VISIBILITY_KEYS = ["bio", "photos", "wall", "wishlist", "location"] as const;
export type VisibilityKey = (typeof VISIBILITY_KEYS)[number];

// Default true when the key is absent — only an explicit `false` hides a section.
export const isVisible = (fv: FieldVisibility | null | undefined, key: string): boolean =>
  fv?.[key] !== false;

export interface RecipientProfile {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  public_page_enabled: boolean;
  field_visibility: FieldVisibility;
  verification_status: VerificationStatus;
}

export interface ProfilePhoto {
  id: string;
  user_id: string;
  url: string;
  sort: number;
  created_at: string;
}

export interface WallPost {
  id: string;
  author_id: string;
  text: string;
  media: string[];
  created_at: string;
}

// Minimal product shape joined into a wishlist row (from the shop catalog).
export interface WishlistProduct {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  images: string[];
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string | null;
  title: string | null;
  note: string | null;
  priority: number;
  created_at: string;
  product?: WishlistProduct | null;
}

export interface RecipientPageData {
  profile: RecipientProfile;
  photos: ProfilePhoto[];
  posts: WallPost[];
  wishlist: WishlistItem[];
}

const PROFILE_COLS =
  "id, name, slug, city, country, bio, avatar_url, cover_url, public_page_enabled, field_visibility, verification_status";

// Raw `profiles` row as returned by PROFILE_COLS selects.
interface RecipientProfileRow {
  id: string;
  name?: string | null;
  slug?: string | null;
  city?: string | null;
  country?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  public_page_enabled?: boolean | null;
  field_visibility?: FieldVisibility | null;
  verification_status?: VerificationStatus | null;
}

function normalizeProfile(row: RecipientProfileRow): RecipientProfile {
  return {
    id: row.id,
    name: row.name ?? "Користувач",
    slug: row.slug ?? null,
    city: row.city ?? null,
    country: row.country ?? null,
    bio: row.bio ?? null,
    avatar_url: row.avatar_url ?? null,
    cover_url: row.cover_url ?? null,
    public_page_enabled: row.public_page_enabled ?? true,
    field_visibility: row.field_visibility ?? {},
    verification_status: row.verification_status ?? "unverified",
  };
}

// Raw `wishlist_items` row with the joined `products` record.
interface WishlistRow {
  id: string;
  user_id: string;
  product_id?: string | null;
  title?: string | null;
  note?: string | null;
  priority?: number | null;
  created_at: string;
  products?: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    images?: string[] | null;
  } | null;
}

function normalizeWishlist(row: WishlistRow): WishlistItem {
  const p = row.products;
  return {
    id: row.id,
    user_id: row.user_id,
    product_id: row.product_id ?? null,
    title: row.title ?? null,
    note: row.note ?? null,
    priority: row.priority ?? 0,
    created_at: row.created_at,
    product: p
      ? {
          id: p.id,
          title: p.title,
          price_cents: p.price_cents,
          currency: p.currency,
          images: p.images ?? [],
        }
      : null,
  };
}

export const useRecipientPage = () => {
  // --- Public read: everything needed to render /u/:slug in one set of queries.
  const getBySlug = async (slug: string): Promise<RecipientPageData | null> => {
    const { data: prof, error } = await from("profiles").select(PROFILE_COLS).eq("slug", slug).maybeSingle();
    if (error || !prof) return null;
    const profile = normalizeProfile(prof);

    const [photosRes, postsRes, wishRes] = await Promise.all([
      from("profile_photos")
        .select("*")
        .eq("user_id", profile.id)
        .order("sort", { ascending: true })
        .order("created_at", { ascending: true }),
      from("wall_posts").select("*").eq("author_id", profile.id).order("created_at", { ascending: false }),
      from("wishlist_items")
        .select("*, products(id, title, price_cents, currency, images)")
        .eq("user_id", profile.id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    return {
      profile,
      photos: (photosRes.data as unknown[] | null)?.map((r) => r as ProfilePhoto) ?? [],
      posts: (postsRes.data as unknown[] | null)?.map((r) => r as WallPost) ?? [],
      wishlist: (wishRes.data as WishlistRow[] | null)?.map(normalizeWishlist) ?? [],
    };
  };

  // --- Owner: fetch own page data, generating a slug on first access if missing.
  const getMine = async (): Promise<RecipientPageData | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: prof, error } = await from("profiles").select(PROFILE_COLS).eq("id", user.id).maybeSingle();
    if (error || !prof) return null;
    const profile = normalizeProfile(prof);

    const [photosRes, postsRes, wishRes] = await Promise.all([
      from("profile_photos")
        .select("*")
        .eq("user_id", profile.id)
        .order("sort", { ascending: true })
        .order("created_at", { ascending: true }),
      from("wall_posts").select("*").eq("author_id", profile.id).order("created_at", { ascending: false }),
      from("wishlist_items")
        .select("*, products(id, title, price_cents, currency, images)")
        .eq("user_id", profile.id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    return {
      profile,
      photos: (photosRes.data as unknown[] | null)?.map((r) => r as ProfilePhoto) ?? [],
      posts: (postsRes.data as unknown[] | null)?.map((r) => r as WallPost) ?? [],
      wishlist: (wishRes.data as WishlistRow[] | null)?.map(normalizeWishlist) ?? [],
    };
  };

  // Ensure the caller's profile has a slug; generate one from their name if not.
  const ensureSlug = async (): Promise<{ slug?: string; error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: prof } = await from("profiles").select("slug, name").eq("id", user.id).maybeSingle();
    const profRow = prof as { slug?: string | null; name?: string | null } | null;
    const existing = profRow?.slug;
    if (existing) return { slug: existing };

    const baseName = profRow?.name || "user";
    let slug: string;
    const { data: rpcSlug, error: rpcError } = await supabase.rpc("generate_profile_slug", {
      p_base: baseName,
    });
    if (!rpcError && rpcSlug) {
      slug = rpcSlug as string;
    } else {
      slug =
        (baseName as string)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-+)|(-+$)/g, "")
          .slice(0, 48) || `user-${user.id.slice(0, 8)}`;
    }

    const { error } = await from("profiles").update({ slug }).eq("id", user.id);
    if (error) return { error: error.message };
    return { slug };
  };

  const setPageEnabled = async (enabled: boolean): Promise<{ error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    const { error } = await from("profiles").update({ public_page_enabled: enabled }).eq("id", user.id);
    return { error: error?.message };
  };

  // Merge a partial section->bool patch into profiles.field_visibility: read the
  // current map, shallow-merge, and write it back.
  const setFieldVisibility = async (
    patch: Record<string, boolean>
  ): Promise<{ error?: string; field_visibility?: FieldVisibility }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    const { data: prof } = await from("profiles").select("field_visibility").eq("id", user.id).maybeSingle();
    const current = (prof as { field_visibility?: FieldVisibility | null } | null)?.field_visibility ?? {};
    const next = { ...current, ...patch };
    const { error } = await from("profiles").update({ field_visibility: next }).eq("id", user.id);
    if (error) return { error: error.message };
    return { field_visibility: next };
  };

  // --- Cover + gallery photos --------------------------------------------------
  const uploadToBucket = async (userId: string, file: File): Promise<string> => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-photos").getPublicUrl(path);
    return publicUrl;
  };

  const uploadCover = async (file: File): Promise<{ url?: string; error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    try {
      const url = await uploadToBucket(user.id, file);
      const { error } = await from("profiles").update({ cover_url: url }).eq("id", user.id);
      if (error) return { error: error.message };
      return { url };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "upload failed" };
    }
  };

  const addPhoto = async (file: File): Promise<{ data?: ProfilePhoto; error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    try {
      const url = await uploadToBucket(user.id, file);
      const { data, error } = await from("profile_photos")
        .insert({ user_id: user.id, url })
        .select("*")
        .single();
      if (error || !data) return { error: error?.message || "insert failed" };
      return { data: data as ProfilePhoto };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "upload failed" };
    }
  };

  const deletePhoto = async (id: string): Promise<{ error?: string }> => {
    const { error } = await from("profile_photos").delete().eq("id", id);
    return { error: error?.message };
  };

  // Upload a single media file (e.g. for a wall post) and return its public URL,
  // without registering it in the gallery.
  const uploadMedia = async (file: File): Promise<{ url?: string; error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    try {
      const url = await uploadToBucket(user.id, file);
      return { url };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "upload failed" };
    }
  };

  // --- Wall --------------------------------------------------------------------
  const addPost = async (
    text: string,
    media: string[] = []
  ): Promise<{ data?: WallPost; error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    const { data, error } = await from("wall_posts")
      .insert({ author_id: user.id, text, media })
      .select("*")
      .single();
    if (error || !data) return { error: error?.message || "insert failed" };
    return { data: data as WallPost };
  };

  const deletePost = async (id: string): Promise<{ error?: string }> => {
    const { error } = await from("wall_posts").delete().eq("id", id);
    return { error: error?.message };
  };

  // --- Wishlist ----------------------------------------------------------------
  const addWishlistProduct = async (productId: string): Promise<{ data?: WishlistItem; error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    const { data, error } = await from("wishlist_items")
      .insert({ user_id: user.id, product_id: productId })
      .select("*, products(id, title, price_cents, currency, images)")
      .single();
    if (error || !data) return { error: error?.message || "insert failed" };
    return { data: normalizeWishlist(data) };
  };

  const addWishlistCustom = async (
    title: string,
    note?: string
  ): Promise<{ data?: WishlistItem; error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    const { data, error } = await from("wishlist_items")
      .insert({ user_id: user.id, title, note: note ?? null })
      .select("*, products(id, title, price_cents, currency, images)")
      .single();
    if (error || !data) return { error: error?.message || "insert failed" };
    return { data: normalizeWishlist(data) };
  };

  const removeWishlist = async (id: string): Promise<{ error?: string }> => {
    const { error } = await from("wishlist_items").delete().eq("id", id);
    return { error: error?.message };
  };

  return {
    getBySlug,
    getMine,
    ensureSlug,
    setPageEnabled,
    setFieldVisibility,
    uploadCover,
    addPhoto,
    deletePhoto,
    uploadMedia,
    addPost,
    deletePost,
    addWishlistProduct,
    addWishlistCustom,
    removeWishlist,
  };
};
