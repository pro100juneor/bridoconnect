import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // null — ещё не знаем (грузим профиль); true — соц-пользователь без завершённого
  // онбординга (роль/согласие), ProtectedRoute уводит его на /welcome.
  needsOnboarding: boolean | null;
  refreshOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  needsOnboarding: null,
  refreshOnboarding: async () => {},
  signOut: async () => {},
  updatePassword: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Онбординг: у соц-пользователя onboarding_completed_at = NULL, пока он не пройдёт
  // /welcome. Fail-open — если запрос/колонка недоступны, не блокируем вход.
  const loadOnboarding = async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", uid)
      .maybeSingle();
    if (error) {
      setNeedsOnboarding(false);
      return;
    }
    setNeedsOnboarding(data ? data.onboarding_completed_at === null : false);
  };

  useEffect(() => {
    if (!user) {
      setNeedsOnboarding(null);
      return;
    }
    void loadOnboarding(user.id);
  }, [user]);

  const refreshOnboarding = async () => {
    if (user) await loadOnboarding(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, needsOnboarding, refreshOnboarding, signOut, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};
