import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, AlertTriangle, Upload, CheckCircle, Circle, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDisputes } from "@/hooks/useDisputes";
import { useT } from "@/i18n/useT";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "@/hooks/use-toast";
import { tap, notify } from "@/lib/native";
import { uploadChatAttachment } from "@/lib/chatAttachments";

interface DisputeProfileJoin {
  name?: string | null;
}

// supabase-js типізує embedded join як масив без FK-метаданих,
// у рантаймі для to-one приходить об'єкт — нормалізуємо обидві форми.
interface DisputeDeal {
  title: string;
  amount: number;
  // Валюта заявки: без неї сумма показывалась бы как EUR независимо от реальной.
  currency?: string | null;
  profiles?: DisputeProfileJoin | DisputeProfileJoin[] | null;
}

const firstJoin = (
  value: DisputeProfileJoin | DisputeProfileJoin[] | null | undefined
): DisputeProfileJoin | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));

// Причина зберігається в БД українською (її читає Trust & Safety),
// показуємо перекладений підпис.
const reasons: { value: string; key: string }[] = [
  { value: "Кошти не отримані", key: "dispute.reason.notReceived" },
  { value: "Послуга не надана", key: "dispute.reason.notProvided" },
  { value: "Неправдива інформація у запиті", key: "dispute.reason.falseInfo" },
  { value: "Підозра на шахрайство", key: "dispute.reason.fraud" },
  { value: "Технічна помилка", key: "dispute.reason.technical" },
  { value: "Інша причина", key: "dispute.reason.other" },
];

const Dispute = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { id } = useParams();
  const { user } = useAuth();
  const { openDispute } = useDisputes();
  const { t } = useT();
  const { money } = useCurrency();

  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [desc, setDesc] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [deal, setDeal] = useState<DisputeDeal | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length === 0 || !id) return;
    void tap("light");
    setUploading(true);
    for (const file of picked) {
      const { path, error } = await uploadChatAttachment("deal", id, file);
      if (error || !path) {
        toast({ title: t("dispute.attachError", "Не вдалося завантажити файл"), variant: "destructive" });
        continue;
      }
      setAttachments((prev) => [...prev, path]);
    }
    setUploading(false);
  };

  useEffect(() => {
    if (!id) return;
    supabase
      .from("deals")
      .select("title, amount, currency, profiles!creator_id(name)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDeal(data);
      });
  }, [id]);

  const submit = async () => {
    if (!reason || !id) return;
    if (!user) {
      toast({ title: t("dispute.needAuth", "Потрібен вхід"), variant: "destructive" });
      navigate("/auth");
      return;
    }
    void tap("medium");
    setSubmitting(true);
    const { data, error } = await openDispute(id, reason, desc, attachments);
    setSubmitting(false);

    if (error || !data) {
      void notify("error");
      toast({
        title: t("dispute.failed", "Не вдалося відкрити спір"),
        description:
          error?.message ?? t("dispute.failedHint", "Спробуйте ще раз або зверніться в підтримку."),
        variant: "destructive",
      });
      return;
    }
    void notify("success");
    setDisputeId(data.id);
    toast({
      title: t("dispute.submitted", "Спір подано"),
      description: t("dispute.submittedHint", "Trust & Safety команда розгляне протягом 48 годин."),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <motion.div
          initial={reduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4"
        >
          <CheckCircle className="w-8 h-8 text-success" strokeWidth={1.75} />
        </motion.div>
        <h1 className="font-serif text-4xl tracking-tight text-foreground mb-2 animate-fade-in">
          {t("dispute.openedTitle", "Спір відкрито")}
        </h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          {t(
            "dispute.openedDesc",
            "Ваше звернення прийнято. Команда Trust & Safety розгляне його протягом 48 годин. Кошти заморожені до вирішення спору."
          )}
        </p>
        <div className="relative w-full p-4 rounded-2xl bg-secondary border border-border mb-6 text-left overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
          <p className="text-xs text-muted-foreground mb-1">{t("dispute.number", "Номер спору")}</p>
          <p className="font-mono font-semibold text-foreground break-all">
            {disputeId ? `DSP-${disputeId.toString().slice(0, 8).toUpperCase()}` : "DSP-PENDING"}
          </p>
        </div>
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-white min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          onClick={() => navigate("/app/deals")}
        >
          {t("dispute.toDeals", "До угод")}
        </Button>
      </main>
    );
  }

  return (
    <main className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back", "Назад")}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">
          {t("dispute.title", "Відкрити спір")}
        </h2>
        <span className="text-xs text-muted-foreground">{step}/2</span>
      </div>

      <div className="flex gap-1 mx-4 mt-4 mb-6 h-1.5">
        {[1, 2].map((s) => (
          <div key={s} className="flex-1 rounded-full bg-secondary relative overflow-hidden">
            {s <= step && (
              <motion.div
                layoutId={`dispute-step-${s}`}
                className="absolute inset-0 bg-destructive rounded-full"
                transition={reduced ? { duration: 0 } : { ease: [0.34, 1.56, 0.64, 1], duration: 0.28 }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="px-4">
        <div className="relative flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl mb-6 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("dispute.dealNo", "Угода")} #{(id || "").slice(0, 8)}
            </p>
            <p className="text-xs text-muted-foreground">
              {deal
                ? `${firstJoin(deal.profiles)?.name || t("common.user", "Користувач")} · ${
                    money(deal.amount, deal.currency).formatted
                  } · ${deal.title}`
                : t("common.loading", "Завантаження…")}
            </p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground mb-4">
              {t("dispute.pickReason", "Оберіть причину спору:")}
            </p>
            {reasons.map((r) => {
              const selected = reason === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => {
                    void tap("light");
                    setReason(r.value);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border min-h-[44px] flex items-center gap-3 transition-all duration-150 hover:-translate-y-px ${
                    selected
                      ? "border-destructive bg-destructive/5 text-foreground font-medium"
                      : "border-border text-foreground"
                  }`}
                >
                  {selected ? (
                    <CircleDot
                      className="w-5 h-5 text-destructive shrink-0"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="w-5 h-5 text-muted-foreground shrink-0"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-sm">{t(r.key, r.value)}</span>
                </button>
              );
            })}
            <Button
              className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-white min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
              disabled={!reason}
              onClick={() => {
                void tap("light");
                setStep(2);
              }}
            >
              {t("common.next", "Далі")} →
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                {t("dispute.describe", "Опишіть ситуацію детально")} *
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={t("dispute.describePlaceholder", "Розкажіть що сталось, коли, які докази є…")}
                rows={5}
                className="w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-accent/30 leading-relaxed"
              />
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={onPickFiles}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full relative border-2 border-dashed border-border rounded-2xl p-6 text-center overflow-hidden disabled:opacity-50 hover:border-accent/50 transition-colors"
              >
                <Upload
                  className={`w-8 h-8 text-muted-foreground mx-auto mb-2 ${uploading ? "animate-pulse" : ""}`}
                  strokeWidth={1.75}
                />
                <p className="text-sm text-muted-foreground">
                  {uploading
                    ? t("dispute.attaching", "Завантаження…")
                    : t("dispute.attach", "Прикріпити скріншоти або документи")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dispute.attachHint", "PNG, JPG, PDF до 10MB")}
                </p>
              </button>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((path, i) => (
                    <div
                      key={path}
                      className="flex items-center justify-between gap-2 text-xs bg-secondary rounded-xl px-3 py-2"
                    >
                      <span className="truncate text-foreground">{path.split("/").pop()}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground shrink-0"
                        aria-label={t("common.remove", "Прибрати")}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 transition-transform duration-150 hover:-translate-y-px"
                onClick={() => {
                  void tap("light");
                  setStep(1);
                }}
                disabled={submitting}
              >
                {t("common.back", "Назад")}
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white transition-transform duration-150 hover:-translate-y-px"
                disabled={!desc || submitting}
                onClick={submit}
              >
                {submitting ? t("dispute.submitting", "Подання…") : t("dispute.submit", "Подати спір")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Dispute;
