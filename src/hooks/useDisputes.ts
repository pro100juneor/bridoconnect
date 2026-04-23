import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Dispute {
  id: string;
  deal_id: string;
  opener_id: string;
  reason: string;
  description: string;
  status: "open" | "reviewing" | "resolved" | "rejected";
  admin_note: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export const useDisputes = (dealId?: string) => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = useCallback(async () => {
    if (!user) {
      setDisputes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase.from("disputes").select("*").order("created_at", { ascending: false });
    if (dealId) query = query.eq("deal_id", dealId);

    const { data, error } = await query;
    if (!error && data) setDisputes(data as Dispute[]);
    setLoading(false);
  }, [user, dealId]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const openDispute = async (
    dealIdArg: string,
    reason: string,
    description: string
  ): Promise<{ data: Dispute | null; error: Error | null }> => {
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("disputes")
      .insert([
        {
          deal_id: dealIdArg,
          opener_id: user.id,
          reason,
          description,
          status: "open",
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setDisputes(prev => [data as Dispute, ...prev]);
      return { data: data as Dispute, error: null };
    }
    // Якщо таблиці ще нема (міграція 007 не застосована) — graceful fallback
    return { data: null, error: error as any };
  };

  return { disputes, loading, openDispute, refetch: fetchDisputes };
};
