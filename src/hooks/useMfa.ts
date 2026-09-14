import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * TOTP-двофакторка поверх Supabase Auth MFA.
 *
 * Життєвий цикл фактора:
 *   enroll()  → фактор зі статусом `unverified` + QR/секрет;
 *   verify()  → статус `verified`, сесія піднімається до aal2;
 *   unenroll()→ фактор видалено (вимагає свіжого aal2 — тому просимо код).
 *
 * Важливо: Supabase не забороняє aal1-сесії читати дані — енфорсмент рівня БД
 * (політики з `auth.jwt()->>'aal' = 'aal2'`) не налаштований. Клієнт тримає
 * гейт у ProtectedRoute; це захищає від входу з украденим паролем через UI,
 * але не від прямих запитів до API. Див. KNOWN_ISSUES.md.
 */

export interface TotpEnrollment {
  factorId: string;
  /** SVG як data-URI — рендериться напряму в <img src>. */
  qrCode: string;
  /** Той самий секрет текстом — для ручного введення в застосунок. */
  secret: string;
}

const FRIENDLY_NAME = "BridoConnect";

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export const useMfa = () => {
  const { user } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setFactorId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) {
      setFactorId(null);
    } else {
      const verified = data.all.find((f) => f.factor_type === "totp" && f.status === "verified");
      setFactorId(verified?.id ?? null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Створює новий TOTP-фактор. Попередньо прибирає підвислі `unverified`
   * фактори від перерваних спроб — інакше GoTrue відмовить на дублікаті імені.
   */
  const startEnrollment = useCallback(async (): Promise<
    { data: TotpEnrollment; error: null } | { data: null; error: string }
  > => {
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const stale of list?.all.filter((f) => f.status === "unverified") ?? []) {
      await supabase.auth.mfa.unenroll({ factorId: stale.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: FRIENDLY_NAME,
    });
    if (error || !data) {
      return { data: null, error: message(error, "Не вдалося створити фактор") };
    }
    return {
      data: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret },
      error: null,
    };
  }, []);

  /** Підтверджує щойно створений фактор кодом із застосунку. */
  const confirmEnrollment = useCallback(
    async (id: string, code: string): Promise<string | null> => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code });
      if (error) return message(error, "Невірний код");
      await refresh();
      return null;
    },
    [refresh]
  );

  /** Відкат незавершеного enroll (користувач закрив діалог). */
  const cancelEnrollment = useCallback(async (id: string) => {
    await supabase.auth.mfa.unenroll({ factorId: id });
  }, []);

  /** Вимкнення 2FA. Код обов'язковий: unenroll вимагає свіжого aal2. */
  const disable = useCallback(
    async (code: string): Promise<string | null> => {
      if (!factorId) return "Двофакторка не увімкнена";
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (verifyErr) return message(verifyErr, "Невірний код");
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) return message(error, "Не вдалося вимкнути");
      await refresh();
      return null;
    },
    [factorId, refresh]
  );

  return { enabled: !!factorId, loading, refresh, startEnrollment, confirmEnrollment, cancelEnrollment, disable };
};
