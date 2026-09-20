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
    if (!userId) {
      setLoading(false);
      return;
    }
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
    // The rating aggregation trigger buckets on reviews.role ('as_sponsor' |
    // 'as_recipient') — the side the reviewee is being rated as. Without it the
    // review never aggregates. Derive it from the deal's parties.
    const { data: deal } = await supabase
      .from("deals")
      .select("creator_id, sponsor_id")
      .eq("id", dealId)
      .maybeSingle();
    const role =
      deal?.sponsor_id === revieweeId
        ? "as_sponsor"
        : deal?.creator_id === revieweeId
          ? "as_recipient"
          : null;
    const { data, error } = await supabase
      .from("reviews")
      .insert([{ deal_id: dealId, reviewer_id: user.id, reviewee_id: revieweeId, rating, text, role }])
      .select()
      .single();
    // NB: profile rating is recomputed by an AFTER-INSERT trigger into
    // rating_as_sponsor/_recipient — the old client-side write to the deprecated
    // profiles.rating column was blocked by RLS and silently failed, so it's gone.
    return { data, error };
  };

  return { reviews, loading, createReview };
};
