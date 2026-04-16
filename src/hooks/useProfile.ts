import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/integrations/supabase/types";

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setProfile(data as unknown as Profile);
        setLoading(false);
      });
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .update(updates as any)
      .eq("id", user.id)
      .select()
      .single();
    if (!error && data) setProfile(data as unknown as Profile);
    return { data, error };
  };

  return { profile, loading, updateProfile };
};
