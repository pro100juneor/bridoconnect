import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Stream {
  id: string;
  host_id: string;
  title: string;
  category: string | null;
  goal_amount: number | null;
  raised: number;
  room_name: string;
  status: "live" | "ended";
  viewer_count: number;
  created_at: string;
  ended_at: string | null;
  host_name?: string;
  host_flag?: string;
  host_avatar?: string;
}

interface Filters {
  status?: "live" | "ended";
  host_id?: string;
  limit?: number;
}

// Raw `streams` row with the joined host profile.
type StreamRow = Stream & {
  profiles?: { name?: string | null; country?: string | null; avatar_url?: string | null } | null;
};

export const useStreams = (filters?: Filters) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  // Destructured into stable locals so the useCallback deps below are plain
  // identifiers (keeps React Compiler's inferred deps in sync with the manual list).
  const filterStatus = filters?.status;
  const filterHostId = filters?.host_id;
  const filterLimit = filters?.limit;

  const fetchStreams = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("streams")
      .select("*, profiles!host_id(name, country, avatar_url)")
      .order("created_at", { ascending: false });

    if (filterStatus) query = query.eq("status", filterStatus);
    if (filterHostId) query = query.eq("host_id", filterHostId);
    if (filterLimit) query = query.limit(filterLimit);

    const { data, error } = await query;
    if (!error && data) {
      const enriched = (data as StreamRow[]).map((s) => ({
        ...s,
        host_name: s.profiles?.name || "Користувач",
        host_flag: s.profiles?.country === "Україна" ? "🇺🇦" : "🏳️",
        host_avatar: s.profiles?.avatar_url || undefined,
      }));
      setStreams(enriched);
    }
    setLoading(false);
  }, [filterStatus, filterHostId, filterLimit]);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  const createStream = async (title: string, category: string, goalAmount?: number) => {
    const roomName = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await supabase
      .from("streams")
      .insert([{ title, category, goal_amount: goalAmount || null, room_name: roomName, status: "live" }])
      .select()
      .single();
    if (!error && data) setStreams((prev) => [data as Stream, ...prev]);
    return { data, error };
  };

  const endStream = async (id: string) => {
    const { data, error } = await supabase
      .from("streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (!error && data) {
      setStreams((prev) => prev.map((s) => (s.id === id ? { ...s, ...(data as Partial<Stream>) } : s)));
    }
    return { data, error };
  };

  const incrementViewers = async (id: string, delta: number = 1) => {
    const target = streams.find((s) => s.id === id);
    if (!target) return;
    const next = Math.max(0, (target.viewer_count || 0) + delta);
    await supabase.from("streams").update({ viewer_count: next }).eq("id", id);
  };

  return { streams, loading, createStream, endStream, incrementViewers, refetch: fetchStreams };
};
