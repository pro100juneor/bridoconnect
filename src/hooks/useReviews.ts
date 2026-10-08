import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Review {
  id: string;
  deal_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  text: string;
  created_at: string;
  reviewer?: { name: string; avatar_url?: string };
}

export const useReviews = (userId?: string) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    // M2: alive-guard — поздний ответ по старому userId не перезаписывает новый.
    let alive = true;
    setLoading(true);
    supabase
      .from("reviews")
      .select("*, reviewer:profiles!reviewer_id(name, avatar_url)")
      .eq("reviewee_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (!error && data) setReviews(data as unknown as Review[]);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  return { reviews, loading };
};
