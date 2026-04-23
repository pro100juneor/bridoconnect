import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FavoriteTarget {
  id: string;
  target_id: string;
  created_at: string;
  target_name?: string;
  target_avatar?: string;
  target_country?: string;
  target_city?: string;
  target_rating?: number;
  target_verified?: boolean;
  target_deals_count?: number;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("favorites")
      .select("*, profiles!target_id(name, avatar_url, country, city, rating, verified, deals_count)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const enriched = data.map((f: any) => ({
        id: f.id,
        target_id: f.target_id,
        created_at: f.created_at,
        target_name: f.profiles?.name || "Користувач",
        target_avatar: f.profiles?.avatar_url || null,
        target_country: f.profiles?.country || null,
        target_city: f.profiles?.city || "",
        target_rating: f.profiles?.rating || 0,
        target_verified: f.profiles?.verified || false,
        target_deals_count: f.profiles?.deals_count || 0,
      }));
      setFavorites(enriched);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addFavorite = async (targetId: string) => {
    if (!user) return { error: new Error("Not authenticated") };
    const { data, error } = await supabase
      .from("favorites")
      .insert([{ user_id: user.id, target_id: targetId }])
      .select()
      .single();
    if (!error && data) await fetchFavorites();
    return { data, error };
  };

  const removeFavorite = async (targetId: string) => {
    if (!user) return { error: new Error("Not authenticated") };
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("target_id", targetId);
    if (!error) setFavorites(prev => prev.filter(f => f.target_id !== targetId));
    return { error };
  };

  const isFavorite = (targetId: string) => favorites.some(f => f.target_id === targetId);

  const toggleFavorite = async (targetId: string) => {
    if (isFavorite(targetId)) {
      return removeFavorite(targetId);
    }
    return addFavorite(targetId);
  };

  return { favorites, loading, addFavorite, removeFavorite, isFavorite, toggleFavorite, refetch: fetchFavorites };
};
