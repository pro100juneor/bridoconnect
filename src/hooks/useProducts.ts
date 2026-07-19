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

function enrich(row: any): Product {
  return {
    ...row,
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
    return (data as any[]).map(enrich);
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
    return (data as any[]).map(enrich);
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
    return (data as any[]).map(enrich);
  };

  const uploadImages = async (userId: string, files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(path);
      urls.push(publicUrl);
    }
    return urls;
  };

  const createProduct = async (payload: {
    title: string;
    description?: string;
    price_cents: number;
    category?: string;
    stock?: number;
    files?: File[];
  }): Promise<{ id?: string; error?: string }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    let images: string[] = [];
    if (payload.files && payload.files.length > 0) {
      try {
        images = await uploadImages(user.id, payload.files);
      } catch (e) {
        return { error: e instanceof Error ? e.message : "upload failed" };
      }
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
        stock: payload.stock ?? 1,
        status: "active",
      } as any)
      .select("id")
      .single();

    if (error || !data) return { error: error?.message || "insert failed" };
    return { id: (data as { id: string }).id };
  };

  return { listProducts, getProduct, productsBySeller, myProducts, createProduct };
};
