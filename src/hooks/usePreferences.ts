import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserPreferences {
  push_notifications: boolean;
  email_notifications: boolean;
  two_factor: boolean;
  dark_mode: boolean;
  language: string;
}

const DEFAULT_PREFS: UserPreferences = {
  push_notifications: true,
  email_notifications: true,
  two_factor: false,
  dark_mode: false,
  language: "uk",
};

export const usePreferences = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [tableAvailable, setTableAvailable] = useState(true);

  const fetchPrefs = useCallback(async () => {
    if (!user) {
      setPrefs(DEFAULT_PREFS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      // Таблиця не створена (міграція 007 не застосована) — використовуємо localStorage fallback
      setTableAvailable(false);
      const local = localStorage.getItem(`prefs_${user.id}`);
      if (local) {
        try {
          setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(local) });
        } catch {
          setPrefs(DEFAULT_PREFS);
        }
      }
    } else if (data) {
      setPrefs({ ...DEFAULT_PREFS, ...(data as any) });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const update = async (patch: Partial<UserPreferences>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next); // оптимістично
    if (!user) return { error: null };

    if (!tableAvailable) {
      // localStorage fallback
      localStorage.setItem(`prefs_${user.id}`, JSON.stringify(next));
      return { error: null };
    }

    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });

    if (error) {
      // відкат — таблиця виявилась недоступною під час запиту
      setTableAvailable(false);
      localStorage.setItem(`prefs_${user.id}`, JSON.stringify(next));
    }
    return { error };
  };

  return { prefs, loading, update, tableAvailable };
};
