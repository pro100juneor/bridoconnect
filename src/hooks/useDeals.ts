import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Deal } from "@/integrations/supabase/types";

interface DealsFilter {
  status?: string;
  creator_id?: string;
  sponsor_id?: string;
  category?: string;
  limit?: number;
}

export const useDeals = (filters?: DealsFilter) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("deals").select("*").order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.creator_id) query = query.eq("creator_id", filters.creator_id);
    if (filters?.sponsor_id) query = query.eq("sponsor_id", filters.sponsor_id);
    if (filters?.category) query = query.eq("category", filters.category);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (!error && data) setDeals(data as unknown as Deal[]);
    setLoading(false);
  }, [filters?.status, filters?.creator_id, filters?.category]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const createDeal = async (deal: Omit<Deal, "id" | "created_at" | "updated_at" | "raised">) => {
    const { data, error } = await supabase.from("deals")
      .insert([{ ...deal as any, raised: 0 }]).select().single();
    if (!error && data) setDeals(prev => [data as unknown as Deal, ...prev]);
    return { data, error };
  };

  const updateDeal = async (id: string, updates: Partial<Deal>) => {
    const { data, error } = await supabase.from("deals")
      .update(updates as any).eq("id", id).select().single();
    if (!error && data) setDeals(prev => prev.map(d => d.id === id ? data as unknown as Deal : d));
    return { data, error };
  };

  const deleteDeal = async (id: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (!error) setDeals(prev => prev.filter(d => d.id !== id));
    return { error };
  };

  return { deals, loading, createDeal, updateDeal, deleteDeal, refetch: fetchDeals };
};
