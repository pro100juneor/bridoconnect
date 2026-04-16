import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePremium = () => {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from("profiles").select("role").eq("id", user.id).single()
      .then(({ data }) => {
        setIsPremium(data?.role === "admin" || false);
        setLoading(false);
      });
  }, [user]);

  return { isPremium, loading };
};
