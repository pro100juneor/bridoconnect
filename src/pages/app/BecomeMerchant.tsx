import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Store, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/i18n/useT";
import { toast } from "@/hooks/use-toast";
import { tap, notify } from "@/lib/native";

interface Application {
  id: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  created_at: string;
}

// Заявка на роль мерчанта (продавца маркетплейса). Решение принимает админ
// (RPC decide_merchant_application) — роль merchant ставится только после одобрения.
const BecomeMerchant = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useT();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [contact, setContact] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from("merchant_applications")
        .select("id, status, reason, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      setApp((data as Application) ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const submit = async () => {
    if (!user || !businessName.trim() || submitting) return;
    void tap("medium");
    setSubmitting(true);
    const { data, error } = await supabase
      .from("merchant_applications")
      .insert([
        {
          user_id: user.id,
          business_name: businessName.trim(),
          contact: contact.trim() || null,
          details: details.trim() || null,
        },
      ])
      .select("id, status, reason, created_at")
      .single();
    setSubmitting(false);
    if (error) {
      void notify("error");
      toast({ title: t("merchant.apply.error", "Не вдалося надіслати заявку"), variant: "destructive" });
      return;
    }
    void notify("success");
    setApp(data as Application);
  };

  const pending = app?.status === "pending";
  const rejected = app?.status === "rejected";

  return (
    <div className="pb-8 min-h-screen">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 z-10 bg-background/85 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back", "Назад")}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h1 className="font-semibold text-foreground">{t("merchant.apply.title", "Стати продавцем")}</h1>
      </div>

      <div className="px-4 pt-5 max-w-screen-sm mx-auto">
        <div className="flex items-start gap-3 bg-secondary rounded-2xl p-4 mb-5">
          <Store className="w-5 h-5 text-accent shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden="true" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(
              "merchant.apply.intro",
              "Продавці розміщують товари у маркетплейсі подарунків. Заявку перевіряє адміністратор; після схвалення ви зможете налаштувати магазин і отримувати виплати."
            )}
          </p>
        </div>

        {loading ? (
          <div className="h-24 rounded-2xl bg-secondary animate-pulse" />
        ) : pending ? (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <Clock className="w-10 h-10 text-warning" strokeWidth={1.5} aria-hidden="true" />
            <p className="font-semibold text-foreground">
              {t("merchant.apply.pending", "Заявка на розгляді")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("merchant.apply.pendingDesc", "Ми повідомимо, щойно адміністратор її розгляне.")}
            </p>
          </div>
        ) : app?.status === "approved" ? (
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <CheckCircle className="w-10 h-10 text-success" strokeWidth={1.5} aria-hidden="true" />
            <p className="font-semibold text-foreground">
              {t("merchant.apply.approved", "Вас схвалено як продавця")}
            </p>
          </div>
        ) : (
          <>
            {rejected && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-2xl p-3 mb-4 text-sm">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden="true" />
                <span>
                  {t("merchant.apply.rejected", "Попередню заявку відхилено.")}
                  {app?.reason ? ` ${app.reason}` : ""}
                </span>
              </div>
            )}
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {t("merchant.apply.businessName", "Назва бізнесу")}
            </label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder={t("merchant.apply.businessNamePlaceholder", "Напр.: Квіткова майстерня")}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground mb-4 focus:ring-2 focus:ring-accent/30"
            />
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {t("merchant.apply.contact", "Контакт (телефон / email)")}
            </label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground mb-4 focus:ring-2 focus:ring-accent/30"
            />
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {t("merchant.apply.details", "Про товари (необовʼязково)")}
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder={t("merchant.apply.detailsPlaceholder", "Що продаєте, звідки доставка…")}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground mb-5 resize-none focus:ring-2 focus:ring-accent/30"
            />
            <Button
              onClick={submit}
              disabled={!businessName.trim() || submitting}
              className="w-full bg-accent hover:bg-accent/90 text-white h-12"
            >
              {submitting
                ? t("merchant.apply.submitting", "Надсилаємо…")
                : t("merchant.apply.submit", "Надіслати заявку")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default BecomeMerchant;
