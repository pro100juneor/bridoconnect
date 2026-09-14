import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMfa, TotpEnrollment } from "@/hooks/useMfa";
import { toast } from "@/hooks/use-toast";
import { tap, notify } from "@/lib/native";

type Mode = "enroll" | "disable";

interface Props {
  mode: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mfa: ReturnType<typeof useMfa>;
}

const CODE_LENGTH = 6;

/**
 * Увімкнення / вимкнення TOTP-двофакторки.
 * enroll: показуємо QR + секрет, чекаємо 6-значний код і верифікуємо фактор.
 * disable: код обов'язковий — Supabase дозволяє unenroll лише зі свіжим aal2.
 */
export const TwoFactorDialog = ({ mode, open, onOpenChange, mfa }: Props) => {
  const { startEnrollment, confirmEnrollment, cancelEnrollment, disable } = mfa;
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Щоб не відкочувати вже підтверджений фактор при закритті діалогу.
  const confirmed = useRef(false);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setError(null);
    setCopied(false);
    confirmed.current = false;
    if (mode !== "enroll") return;

    let alive = true;
    setBusy(true);
    void (async () => {
      const { data, error: err } = await startEnrollment();
      if (!alive) return;
      if (err) setError(err);
      else setEnrollment(data);
      setBusy(false);
    })();
    return () => {
      alive = false;
    };
  }, [open, mode, startEnrollment]);

  const close = useCallback(
    (next: boolean) => {
      if (busy) return;
      // Незавершений enroll не має лишати «висячий» unverified-фактор.
      if (!next && mode === "enroll" && enrollment && !confirmed.current) {
        void cancelEnrollment(enrollment.factorId);
        setEnrollment(null);
      }
      onOpenChange(next);
    },
    [busy, mode, enrollment, cancelEnrollment, onOpenChange]
  );

  const submit = async () => {
    if (code.length !== CODE_LENGTH) return;
    void tap("medium");
    setBusy(true);
    setError(null);
    const err =
      mode === "enroll"
        ? await confirmEnrollment(enrollment?.factorId ?? "", code)
        : await disable(code);
    setBusy(false);
    if (err) {
      void notify("error");
      setError(err);
      setCode("");
      return;
    }
    confirmed.current = true;
    void notify("success");
    toast({
      title: mode === "enroll" ? "Двофакторку увімкнено" : "Двофакторку вимкнено",
      description:
        mode === "enroll"
          ? "Наступного входу знадобиться код із застосунку."
          : "Вхід тепер лише за паролем.",
    });
    onOpenChange(false);
  };

  const copySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
      void tap("light");
    } catch {
      toast({ title: "Не вдалося скопіювати", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "enroll" ? "Увімкнути двофакторну автентифікацію" : "Вимкнути двофакторку"}
          </DialogTitle>
          <DialogDescription>
            {mode === "enroll"
              ? "Відскануйте QR-код у Google Authenticator, 1Password, Aegis або іншому TOTP-застосунку та введіть код, який він покаже."
              : "Підтвердьте дію кодом із застосунку — без нього вимкнути не можна."}
          </DialogDescription>
        </DialogHeader>

        {mode === "enroll" && enrollment && (
          <div className="flex flex-col items-center gap-3">
            <img
              src={enrollment.qrCode}
              alt="QR-код для TOTP-застосунку"
              className="w-44 h-44 rounded-xl bg-white p-2"
            />
            <p className="text-xs text-muted-foreground">Або введіть ключ вручну:</p>
            <button
              type="button"
              onClick={() => void copySecret()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary text-xs font-mono break-all min-h-[44px]"
            >
              {enrollment.secret}
              {copied ? (
                <Check className="w-4 h-4 text-success shrink-0" strokeWidth={1.75} />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
              )}
            </button>
          </div>
        )}

        {mode === "enroll" && !enrollment && busy && (
          <p className="text-sm text-muted-foreground text-center py-6">Готуємо ключ…</p>
        )}

        {(mode === "disable" || enrollment) && (
          <div>
            <label
              htmlFor="mfa-code"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5"
            >
              Код із застосунку
            </label>
            <input
              id="mfa-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className="w-full bg-secondary rounded-xl px-4 py-3 text-center text-lg tracking-[0.4em] font-mono outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30"
            />
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={busy} onClick={() => close(false)}>
            Скасувати
          </Button>
          <Button
            variant={mode === "disable" ? "destructive" : "default"}
            disabled={busy || code.length !== CODE_LENGTH}
            onClick={() => void submit()}
          >
            {busy ? "Перевіряємо…" : mode === "enroll" ? "Підтвердити" : "Вимкнути"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
