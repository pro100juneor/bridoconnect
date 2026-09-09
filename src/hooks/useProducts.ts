import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  category?: string | null;
  images: string[];
  videos: string[];
  stock: number;
  status: "active" | "hidden" | "sold";
  created_at: string;
  updated_at: string;
  // Joined from profiles!seller_id
  seller_name?: string;
  seller_country?: string | null;
  seller_rating?: number;
  seller_verified?: boolean;
  seller_connect_status?: string;
}

const SELLER_JOIN = `
  *,
  profiles!seller_id(name, country, rating, verified, stripe_connect_status)
`;

interface SellerJoin {
  name: string | null;
  country: string | null;
  rating: number | null;
  verified: boolean | null;
  stripe_connect_status: string | null;
}

interface ProductRow {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  category: string | null;
  images: string[];
  videos: string[] | null;
  stock: number;
  status: Product["status"];
  created_at: string;
  updated_at: string;
  profiles: SellerJoin | null;
}

function enrich(row: ProductRow): Product {
  return {
    ...row,
    videos: row.videos ?? [],
    seller_name: row.profiles?.name || "Продавець",
    seller_country: row.profiles?.country ?? null,
    seller_rating: row.profiles?.rating ?? 0,
    seller_verified: row.profiles?.verified ?? false,
    seller_connect_status: row.profiles?.stripe_connect_status ?? "none",
  };
}

export const useProducts = () => {
  const listProducts = async (category?: string): Promise<Product[]> => {
    let query = supabase
      .from("products")
      .select(SELLER_JOIN)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (category && category !== "Всі") query = query.eq("category", category);
    const { data, error } = await query;
    if (error || !data) return [];
    return (data as ProductRow[]).map(enrich);
  };

  const getProduct = async (id: string): Promise<Product | null> => {
    const { data, error } = await supabase.from("products").select(SELLER_JOIN).eq("id", id).maybeSingle();
    if (error || !data) return null;
    return enrich(data);
  };

  const productsBySeller = async (sellerId: string): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(SELLER_JOIN)
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as ProductRow[]).map(enrich);
  };

  const myProducts = async (): Promise<Product[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("products")
      .select(SELLER_JOIN)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as ProductRow[]).map(enrich);
  };

  const MAX_IMAGES = 20;
  const MAX_VIDEOS = 5;

  // Uploads files into `${userId}/${uuid}.${ext}` inside the given public bucket
  // and returns their public URLs.
  const uploadToBucket = async (
    bucket: "product-images" | "product-videos",
    userId: string,
    files: File[],
    fallbackExt: string
  ): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || fallbackExt;
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(path);
      urls.push(publicUrl);
    }
    return urls;
  };

  const createProduct = async (payload: {
    title: string;
    description?: string;
    price_cents: number;
    category?: string;
    images?: File[];
    videos?: File[];
  }): Promise<{ id?: string; error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const imageFiles = payload.images ?? [];
    const videoFiles = payload.videos ?? [];
    if (imageFiles.length > MAX_IMAGES) return { error: `Максимум ${MAX_IMAGES} фото` };
    if (videoFiles.length > MAX_VIDEOS) return { error: `Максимум ${MAX_VIDEOS} відео` };

    let images: string[] = [];
    let videos: string[] = [];
    try {
      if (imageFiles.length > 0) images = await uploadToBucket("product-images", user.id, imageFiles, "jpg");
      if (videoFiles.length > 0) videos = await uploadToBucket("product-videos", user.id, videoFiles, "mp4");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "upload failed" };
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        seller_id: user.id,
        title: payload.title,
        description: payload.description ?? null,
        price_cents: payload.price_cents,
        currency: "eur",
        category: payload.category ?? null,
        images,
        videos,
        stock: 1, // one position = exactly one physical unit
        status: "active",
      })
      .select("id")
      .single();

    if (error || !data) return { error: error?.message || "insert failed" };
    return { id: (data as { id: string }).id };
  };

  return { listProducts, getProduct, productsBySeller, myProducts, createProduct };
};
