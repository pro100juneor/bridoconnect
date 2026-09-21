import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { HandHeart, HandHelping, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useT } from "@/i18n/useT";

// Экран-догмолка для новых соц-пользователей (Apple/Google): вход прошёл, но роль и
// согласие 18+/Условия ещё не собраны (соц-вход обходит форму регистрации). Пишем их
// через RPC complete_social_onboarding (роль в profiles защищена от клиентского UPDATE).
const Welcome = () => {
  const navigate = useNavigate();
  const { t } = useT();
  const { refreshOnboarding } = useAuth();
  const [role, setRole] = useState<"sponsor" | "recipient">("sponsor");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!agreed) {
      toast({ title: t("auth.register.mustAgree", "Потрібно прийняти умови"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("complete_social_onboarding", {
      p_role: role,
      p_age_confirmed: true,
      p_terms_accepted: true,
    });
    setLoading(false);
    if (error) {
      toast({
        title: t("welcome.error.title", "Не вдалося зберегти"),
        description: t("welcome.error.desc", "Спробуйте ще раз."),
        variant: "destructive",
      });
      return;
    }
    await refreshOnboarding();
    navigate("/app", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 pb-8 bg-background">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-foreground mb-2">{t("welcome.title", "Ще один крок")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("welcome.subtitle", "Оберіть роль і підтвердіть умови, щоб продовжити.")}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
            {t("auth.register.roleLabel", "Я хочу")}
          </label>
          <div className="flex flex-col gap-2">
            {[
              {
                value: "sponsor" as const,
                label: t("auth.register.role.sponsor", "Допомагати"),
                caption: t("auth.register.role.sponsorCaption", "Спонсор · Донор"),
                Icon: HandHeart,
                tall: true,
              },
              {
                value: "recipient" as const,
                label: t("auth.register.role.recipient", "Отримати допомогу"),
                caption: t("auth.register.role.recipientCaption", "Виконавець · Отримувач"),
                Icon: HandHelping,
              },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex items-center gap-3 ${r.tall ? "py-4" : "py-3"} px-4 rounded-xl border text-left transition-all duration-150 hover:-translate-y-px ${role === r.value ? "border-accent bg-accent/10 text-accent" : "border-border text-foreground"}`}
              >
                <r.Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{r.label}</div>
                  <div className="text-[11px] text-muted-foreground">{r.caption}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-accent"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            {t("auth.register.agreePrefix", "Мені є 18 років, і я приймаю")}{" "}
            <Link to="/agb" className="text-accent underline">
              {t("auth.register.terms", "Умови користування")}
            </Link>{" "}
            {t("auth.register.and", "та")}{" "}
            <Link to="/datenschutz" className="text-accent underline">
              {t("auth.register.privacy", "Політику конфіденційності")}
            </Link>
            .
          </span>
        </label>

        <Button
          onClick={handleSubmit}
          disabled={loading || !agreed}
          className="w-full bg-accent hover:bg-accent/90 text-white gap-2 h-12 transition-transform duration-150 hover:-translate-y-px"
        >
          {loading ? t("welcome.submitting", "Зберігаємо…") : t("welcome.cta", "Продовжити")}
          {!loading && <ArrowRight className="w-4 h-4" strokeWidth={1.75} />}
        </Button>
      </div>
    </div>
  );
};

export default Welcome;
