import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Deal } from "@/integrations/supabase/types";

interface DealWithProfile extends Deal {
  creator_name?: string;
  creator_flag?: string;
  creator_city?: string;
  creator_rating?: number;
  creator_deals?: number;
  creator_verified?: boolean;
}

interface DealCreatorJoin {
  name: string | null;
  country: string | null;
  city: string | null;
  rating: number | null;
  deals_count: number | null;
  verified: boolean | null;
}

type DealRow = Deal & { profiles: DealCreatorJoin | null };

interface DealsFilter {
  status?: string;
  creator_id?: string;
  sponsor_id?: string;
  category?: string;
  limit?: number;
}

export const useDeals = (filters?: DealsFilter) => {
  const [deals, setDeals] = useState<DealWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  // Примітивні залежності: новий об'єкт filters на кожному рендері не викликає перезапит
  const { status, creator_id, sponsor_id, category, limit } = filters ?? {};

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("deals")
      .select(
        `
        *,
        profiles!creator_id(
          name, country, city, rating, deals_count, verified
        )
      `
      )
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (creator_id) query = query.eq("creator_id", creator_id);
    if (sponsor_id) query = query.eq("sponsor_id", sponsor_id);
    if (category) query = query.eq("category", category);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (!error && data) {
      const enriched = data.map((d: DealRow) => ({
        ...d,
        creator_name: d.profiles?.name || "Користувач",
        creator_flag: d.profiles?.country === "Україна" ? "🇺🇦" : "🏳️",
        creator_city: d.profiles?.city || "",
        creator_rating: d.profiles?.rating || 0,
        creator_deals: d.profiles?.deals_count || 0,
        creator_verified: d.profiles?.verified || false,
      }));
      setDeals(enriched);
    }
    setLoading(false);
  }, [status, creator_id, sponsor_id, category, limit]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const createDeal = async (deal: Omit<Deal, "id" | "created_at" | "updated_at" | "raised">) => {
    const { data, error } = await supabase
      .from("deals")
      .insert([{ ...deal, raised: 0 }])
      .select()
      .single();
    if (!error && data) setDeals((prev) => [data as unknown as DealWithProfile, ...prev]);
    return { data, error };
  };

  const updateDeal = async (id: string, updates: Partial<Deal>) => {
    const { data, error } = await supabase.from("deals").update(updates).eq("id", id).select().single();
    if (!error && data) setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    return { data, error };
  };

  const deleteDeal = async (id: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (!error) setDeals((prev) => prev.filter((d) => d.id !== id));
    return { error };
  };

  return { deals, loading, createDeal, updateDeal, deleteDeal, refetch: fetchDeals };
};
