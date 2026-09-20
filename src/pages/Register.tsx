import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, UserPlus, CheckCircle, HandHeart, HandHelping } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Confetti } from "@/components/Confetti";
import { isNative } from "@/lib/native";
import { useT } from "@/i18n/useT";

const Register = () => {
  const navigate = useNavigate();
  const { t } = useT();
  const reduced = useReducedMotion();
  const [step, setStep] = useState<"form" | "success">("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "sponsor" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (step !== "success") return;
    setCelebrate(true);
    // Переименован из t — чтобы не затенять функцию перевода t() из useT().
    const timer = setTimeout(() => setCelebrate(false), 3000);
    return () => clearTimeout(timer);
  }, [step]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast({ title: t("auth.register.mismatch", "Паролі не збігаються"), variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: t("auth.register.tooShort", "Пароль мінімум 6 символів"), variant: "destructive" });
      return;
    }
    if (!agreed) {
      toast({
        title: t("auth.register.mustAgree", "Потрібно прийняти умови"),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { name: form.name, role: form.role },
        emailRedirectTo: window.location.origin + "/app",
      },
    });
    setLoading(false);
    if (error) {
      toast({
        title: t("auth.register.error.title", "Помилка реєстрації"),
        description:
          // Сообщение от Supabase приходит на английском — переводим только известный кейс.
          error.message === "User already registered"
            ? t("auth.register.error.exists", "Цей email вже зареєстровано")
            : error.message,
        variant: "destructive",
      });
      return;
    }
    // autoconfirm увімкнений — session є одразу
    if (signUpData?.session) {
      navigate("/app");
      return;
    }
    // autoconfirm вимкнений — спробуємо signIn автоматично
    setLoading(true);
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (signInData?.session) {
      navigate("/app");
      return;
    }
    // Якщо все рівно немає сесії — показуємо екран підтвердження email
    setStep("success");
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/app" },
    });
    if (error) {
      toast({
        title: t("auth.google.notConfigured.title", "Вхід через Google недоступний"),
        description: t(
          "auth.google.notConfigured.register",
          "Зараз реєстрація через Google недоступна. Скористайтесь email."
        ),
        variant: "destructive",
      });
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
        <Confetti trigger={celebrate && !reduced} />
        <motion.div
          initial={reduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4"
        >
          <CheckCircle className="w-8 h-8 text-success" strokeWidth={1.75} />
        </motion.div>
        <h2 className="font-serif text-2xl text-foreground mb-2">
          {t("auth.register.success.title", "Майже готово!")}
        </h2>
        <p className="text-muted-foreground text-sm mb-2">
          {t("auth.register.success.sentTo", "Ми надіслали лист підтвердження на:")}
        </p>
        <p className="font-semibold text-foreground mb-6">{form.email}</p>
        <p className="text-xs text-muted-foreground mb-6">
          {t("auth.register.success.hint", "Підтвердіть email і потім увійдіть в акаунт.")}
        </p>
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-white h-12 transition-transform duration-150 hover:-translate-y-px"
          onClick={() => navigate("/auth")}
        >
          {t("auth.register.success.cta", "До входу →")}
        </Button>
      </div>
    );
  }

  // Form-field stagger: each field appears 0.05s after the previous.
  const fieldEnter = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
        };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-12 pb-8 bg-background">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-foreground mb-2">{t("auth.register.title", "Реєстрація")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("auth.register.subtitle", "Приєднатись до BridoConnect")}
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <motion.div {...fieldEnter(0.0)}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            {t("auth.register.roleLabel", "Я хочу")}
          </label>
          {/* DESIGN.md §Banned: 50/50 grid → vertical stack, taller editorial anchor */}
          <div className="flex flex-col gap-2">
            {[
              // value уходит в БД (profiles.role) — не переводится, переводятся только подписи.
              {
                value: "sponsor",
                label: t("auth.register.role.sponsor", "Допомагати"),
                caption: t("auth.register.role.sponsorCaption", "Спонсор · Донор"),
                Icon: HandHeart,
                tall: true,
              },
              {
                value: "recipient",
                label: t("auth.register.role.recipient", "Отримати допомогу"),
                caption: t("auth.register.role.recipientCaption", "Виконавець · Отримувач"),
                Icon: HandHelping,
              },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm({ ...form, role: r.value })}
                className={`flex items-center gap-3 ${r.tall ? "py-4" : "py-3"} px-4 rounded-xl border text-left transition-all duration-150 hover:-translate-y-px ${form.role === r.value ? "border-accent bg-accent/10 text-accent" : "border-border text-foreground"}`}
              >
                <r.Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{r.label}</div>
                  <div className="text-[11px] text-muted-foreground">{r.caption}</div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div {...fieldEnter(0.05)}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            {t("auth.register.name", "Ім'я")}
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder={t("auth.register.namePlaceholder", "Ваше ім'я")}
            autoComplete="name"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
          />
        </motion.div>

        <motion.div {...fieldEnter(0.1)}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            {t("auth.register.email", "Email")}
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            placeholder="your@email.com"
            autoComplete="email"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
          />
        </motion.div>

        <motion.div {...fieldEnter(0.15)}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            {t("auth.register.password", "Пароль")}
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              placeholder={t("auth.register.passwordPlaceholder", "Мінімум 6 символів")}
              autoComplete="new-password"
              className="w-full bg-secondary rounded-xl px-4 py-3 pr-12 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              aria-label={
                showPass
                  ? t("auth.password.hide", "Сховати пароль")
                  : t("auth.password.show", "Показати пароль")
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>

        <motion.div {...fieldEnter(0.2)}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            {t("auth.register.confirm", "Підтвердіть пароль")}
          </label>
          <input
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
            placeholder={t("auth.register.confirmPlaceholder", "Повторіть пароль")}
            autoComplete="new-password"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
          />
          {form.confirm && form.password !== form.confirm && (
            <p className="text-xs text-destructive mt-1">
              {t("auth.register.mismatch", "Паролі не збігаються")}
            </p>
          )}
        </motion.div>

        <motion.label {...fieldEnter(0.22)} className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-accent"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            {t("auth.register.agreePrefix", "Я приймаю")}{" "}
            <Link to="/agb" className="text-accent underline">
              {t("auth.register.terms", "Умови користування")}
            </Link>{" "}
            {t("auth.register.and", "та")}{" "}
            <Link to="/datenschutz" className="text-accent underline">
              {t("auth.register.privacy", "Політику конфіденційності")}
            </Link>
            .
          </span>
        </motion.label>

        <motion.div {...fieldEnter(0.25)}>
          <Button
            type="submit"
            className="w-full bg-accent hover:bg-accent/90 text-white gap-2 h-12 transition-transform duration-150 hover:-translate-y-px"
            disabled={loading || !agreed}
          >
            {loading ? (
              // DESIGN.md §Loading: no spinning circles — pulse instead.
              <motion.span
                animate={reduced ? {} : { opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 0.9 }}
                className="text-sm"
              >
                {t("auth.register.submitting", "Реєструємо…")}
              </motion.span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" strokeWidth={1.75} />
                {t("auth.register.submit", "Зареєструватись")}
              </>
            )}
          </Button>
        </motion.div>
      </form>

      {/* На iOS сторонні логіни приховані (guideline 4.8) — див. Auth.tsx */}
      {!isNative && (
        <div className="mt-5">
          <div className="relative flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t("auth.or", "або")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <Button variant="outline" className="w-full h-12" onClick={handleGoogle}>
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("auth.register.google", "Зареєструватись через Google")}
          </Button>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground mt-5">
        {t("auth.register.haveAccount", "Вже є акаунт?")}{" "}
        <Link to="/auth" className="text-accent font-semibold">
          {t("auth.register.login", "Увійти")}
        </Link>
      </p>
    </div>
  );
};
export default Register;
