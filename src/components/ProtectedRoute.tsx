import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MfaChallenge } from "@/components/MfaChallenge";

const Spinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
    <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    <p className="text-sm text-muted-foreground">Завантаження...</p>
  </div>
);

/** aal1 при доступному aal2 = пароль введено, другий фактор — ще ні. */
type AalState = "checking" | "ok" | "needs-mfa";

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, session, loading } = useAuth();
  const [aal, setAal] = useState<AalState>("checking");

  useEffect(() => {
    if (!user) {
      setAal("checking");
      return;
    }
    let alive = true;
    void (async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!alive) return;
      // Fail-open: збій перевірки не має замикати користувача поза акаунтом.
      // Це клієнтський гейт — на рівні БД aal не енфорситься (див. KNOWN_ISSUES.md).
      if (error || !data) {
        setAal("ok");
        return;
      }
      setAal(data.nextLevel === "aal2" && data.currentLevel !== "aal2" ? "needs-mfa" : "ok");
    })();
    return () => {
      alive = false;
    };
    // session у залежностях: після challengeAndVerify приходить нова сесія (aal2)
    // і перевірку треба прогнати ще раз.
  }, [user, session]);

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (aal === "checking") return <Spinner />;
  if (aal === "needs-mfa") return <MfaChallenge />;

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
