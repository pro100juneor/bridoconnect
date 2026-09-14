import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { tap, notify } from "@/lib/native";

const CODE_LENGTH = 6;

/**
 * Екран другого фактора після входу за паролем.
 * Сесія вже існує, але на рівні aal1 — challengeAndVerify піднімає її до aal2
 * і перевидає токени; AuthContext підхоплює нову сесію через onAuthStateChange.
 */
export const MfaChallenge = () => {
  const { signOut } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (code.length !== CODE_LENGTH) return;
    void tap("medium");
    setBusy(true);
    setError(null);

    const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
    const totp = factors?.all.find((f) => f.factor_type === "totp" && f.status === "verified");
    if (listErr || !totp) {
      setBusy(false);
      setError("Не вдалося отримати фактори. Спробуйте увійти ще раз.");
      return;
    }

    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId: totp.id,
      code,
    });
    setBusy(false);
    if (verifyErr) {
      void notify("error");
      setError("Невірний або протермінований код");
      setCode("");
      return;
    }
    void notify("success");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <ShieldCheck className="w-10 h-10 text-accent mb-4" strokeWidth={1.5} aria-hidden="true" />
        <h1 className="font-serif text-3xl tracking-tight text-foreground mb-2">Підтвердьте вхід</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Введіть шестизначний код із вашого TOTP-застосунку.
        </p>

        <label
          htmlFor="mfa-login-code"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5"
        >
          Код
        </label>
        <input
          id="mfa-login-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          className="w-full bg-secondary rounded-xl px-4 py-3 text-center text-lg tracking-[0.4em] font-mono outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30"
        />
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}

        <Button
          className="w-full h-12 mt-4 bg-accent hover:bg-accent/90 text-white"
          disabled={busy || code.length !== CODE_LENGTH}
          onClick={() => void submit()}
        >
          {busy ? "Перевіряємо…" : "Увійти"}
        </Button>

        <button
          onClick={() => void signOut()}
          className="w-full text-xs text-muted-foreground mt-4 min-h-[44px]"
        >
          Вийти з акаунту
        </button>
      </div>
    </main>
  );
};
