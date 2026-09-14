import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/integrations/supabase/types";

// Поля, скрытые владельцем через field_visibility, физически убраны из публичной
// profiles в profile_hidden_fields (миграция 038): в profiles остаётся NULL.
// Владельцу своя анкета нужна целиком — доклеиваем настоящие значения из сейфа
// (RLS отдаёт строку только ему самому).
interface HiddenFields {
  bio?: string | null;
  city?: string | null;
  country?: string | null;
}

const mergeHidden = (row: Profile, hidden: HiddenFields | null): Profile =>
  hidden
    ? {
        ...row,
        bio: row.bio ?? hidden.bio ?? undefined,
        city: row.city ?? hidden.city ?? undefined,
        country: row.country ?? hidden.country ?? undefined,
      }
    : row;

const fetchHidden = async (userId: string): Promise<HiddenFields | null> => {
  const { data } = await supabase
    .from("profile_hidden_fields")
    .select("bio, city, country")
    .eq("profile_id", userId)
    .maybeSingle();
  return (data as HiddenFields | null) ?? null;
};

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const userId = user.id;
    void (async () => {
      const [{ data, error }, hidden] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        fetchHidden(userId),
      ]);
      if (!error && data) setProfile(mergeHidden(data as unknown as Profile, hidden));
      setLoading(false);
    })();
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: "Not authenticated" };
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (!error && data) {
      // Триггер мог увести bio/city/country в сейф — перечитываем его.
      const hidden = await fetchHidden(user.id);
      setProfile(mergeHidden(data as unknown as Profile, hidden));
    }
    return { data, error };
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: "Not authenticated" };
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) return { error: uploadError.message };

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const result = await updateProfile({ avatar_url: publicUrl });
    return result;
  };

  return { profile, loading, updateProfile, uploadAvatar };
};
