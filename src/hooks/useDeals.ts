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

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("deals")
      .select(`
        *,
        profiles!creator_id(
          name, country, city, rating, deals_count, verified
        )
      `)
      .order("created_at", { ascending: false });

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.creator_id) query = query.eq("creator_id", filters.creator_id);
    if (filters?.sponsor_id) query = query.eq("sponsor_id", filters.sponsor_id);
    if (filters?.category) query = query.eq("category", filters.category);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (!error && data) {
      const enriched = data.map((d: any) => ({
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
  }, [filters?.status, filters?.creator_id, filters?.category]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const createDeal = async (deal: Omit<Deal, "id" | "created_at" | "updated_at" | "raised">) => {
    const { data, error } = await supabase
      .from("deals")
      .insert([{ ...deal as any, raised: 0 }])
      .select()
      .single();
    if (!error && data) setDeals(prev => [data as unknown as DealWithProfile, ...prev]);
    return { data, error };
  };

  const updateDeal = async (id: string, updates: Partial<Deal>) => {
    const { data, error } = await supabase
      .from("deals")
      .update(updates as any)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setDeals(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
    return { data, error };
  };

  const deleteDeal = async (id: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (!error) setDeals(prev => prev.filter(d => d.id !== id));
    return { error };
  };

  return { deals, loading, createDeal, updateDeal, deleteDeal, refetch: fetchDeals };
};
