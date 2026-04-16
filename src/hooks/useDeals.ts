import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Deal } from "@/integrations/supabase/types";

export const useDeals = (filters?: { status?: string; creator_id?: string }) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query = supabase.from("deals").select("*").order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.creator_id) query = query.eq("creator_id", filters.creator_id);
    query.then(({ data, error }) => {
      if (!error && data) setDeals(data as unknown as Deal[]);
      setLoading(false);
    });
  }, []);

  const createDeal = async (deal: Omit<Deal, "id" | "created_at" | "updated_at" | "raised">) => {
    const { data, error } = await supabase.from("deals").insert([deal as any]).select().single();
    if (!error && data) setDeals(prev => [data as unknown as Deal, ...prev]);
    return { data, error };
  };

  return { deals, loading, createDeal };
};
