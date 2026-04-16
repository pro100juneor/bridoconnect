import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from("reviews")
      .select("*, reviewer:profiles!reviewer_id(name, avatar_url)")
      .eq("reviewee_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setReviews(data as unknown as Review[]);
        setLoading(false);
      });
  }, [userId]);

  const createReview = async ({
    dealId,
    revieweeId,
    rating,
    text,
  }: {
    dealId: string;
    revieweeId: string;
    rating: number;
    text: string;
  }) => {
    if (!user) return { error: "Not authenticated" };
    const { data, error } = await supabase
      .from("reviews")
      .insert([{ deal_id: dealId, reviewer_id: user.id, reviewee_id: revieweeId, rating, text }] as any)
      .select()
      .single();

    if (!error && data) {
      // Update user rating
      const { data: allReviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("reviewee_id", revieweeId);
      if (allReviews) {
        const avg = allReviews.reduce((s: number, r: any) => s + r.rating, 0) / allReviews.length;
        await supabase.from("profiles").update({ rating: avg } as any).eq("id", revieweeId);
      }
    }
    return { data, error };
  };

  return { reviews, loading, createReview };
};
