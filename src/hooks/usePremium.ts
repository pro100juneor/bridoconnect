import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PremiumStatus {
  isPremium: boolean;
  plan: "free" | "monthly" | "yearly";
  loading: boolean;
}

export const usePremium = (): PremiumStatus => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PremiumStatus>({
    isPremium: false,
    plan: "free",
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setStatus({ isPremium: false, plan: "free", loading: false });
      return;
    }
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const isPremium = data?.role === "admin";
        setStatus({
          isPremium,
          plan: isPremium ? "monthly" : "free",
          loading: false,
        });
      });
  }, [user]);

  return status;
};
