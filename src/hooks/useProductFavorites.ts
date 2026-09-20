import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Persisted "likes" for shop products (table public.product_favorites).
// Mirrors useFavorites (people), but keyed by product_id and stored as a Set
// for O(1) membership checks in list screens.
export const useProductFavorites = () => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("product_favorites")
      .select("product_id")
      .eq("user_id", user.id);
    if (!error && data) {
      setFavoriteIds(new Set((data as { product_id: string }[]).map((r) => r.product_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = (productId: string) => favoriteIds.has(productId);

  const addFavorite = async (productId: string) => {
    if (!user) return { error: new Error("Not authenticated") };
    setFavoriteIds((prev) => new Set(prev).add(productId)); // optimistic
    const { error } = await supabase
      .from("product_favorites")
      .insert([{ user_id: user.id, product_id: productId }]);
    if (error) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
    return { error };
  };

  const removeFavorite = async (productId: string) => {
    if (!user) return { error: new Error("Not authenticated") };
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    }); // optimistic
    const { error } = await supabase
      .from("product_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);
    if (error) setFavoriteIds((prev) => new Set(prev).add(productId));
    return { error };
  };

  const toggleFavorite = async (productId: string) =>
    isFavorite(productId) ? removeFavorite(productId) : addFavorite(productId);

  return {
    favoriteIds,
    loading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    refetch: fetchFavorites,
  };
};
