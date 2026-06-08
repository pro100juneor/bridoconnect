import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, AlertTriangle, Upload, CheckCircle, Circle, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDisputes } from "@/hooks/useDisputes";
import { toast } from "@/hooks/use-toast";
import { tap, notify } from "@/lib/native";

const reasons = [
  "Кошти не отримані",
  "Послуга не надана",
  "Неправдива інформація у запиті",
  "Підозра на шахрайство",
  "Технічна помилка",
  "Інша причина",
];

const Dispute = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { id } = useParams();
  const { user } = useAuth();
  const { openDispute } = useDisputes();

  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [desc, setDesc] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [deal, setDeal] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("deals")
      .select("title, amount, profiles!creator_id(name)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDeal(data);
      });
  }, [id]);

  const submit = async () => {
    if (!reason || !id) return;
    if (!user) {
      toast({ title: "Потрібен вхід", variant: "destructive" });
      navigate("/auth");
      return;
    }
    void tap("medium");
    setSubmitting(true);
    const { data, error } = await openDispute(id, reason, desc);
    setSubmitting(false);

    if (error || !data) {
      void notify("error");
      toast({
        title: "Не вдалося відкрити спір",
        description: error?.message ?? "Спробуйте ще раз або зверніться в підтримку.",
        variant: "destructive",
      });
      return;
    }
    void notify("success");
    setDisputeId(data.id);
    toast({ title: "Спір подано", description: "Trust & Safety команда розгляне протягом 48 годин." });
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
        <h1 className="font-serif text-4xl tracking-tight text-foreground mb-2 animate-fade-in">Спір відкрито</h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Ваше звернення прийнято. Команда Trust & Safety розгляне його протягом 48 годин.
          Кошти заморожені до вирішення спору.
        </p>
        <div className="relative w-full p-4 rounded-2xl bg-secondary border border-border mb-6 text-left overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
          <p className="text-xs text-muted-foreground mb-1">Номер спору</p>
          <p className="font-mono font-semibold text-foreground break-all">
            {disputeId ? `DSP-${disputeId.toString().slice(0, 8).toUpperCase()}` : "DSP-PENDING"}
          </p>
        </div>
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-white min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          onClick={() => navigate("/app/deals")}
        >
          До угод
        </Button>
      </main>
    );
  }

  return (
    <main className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">Відкрити спір</h2>
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
            <p className="text-sm font-semibold text-foreground">Угода #{(id || "").slice(0, 8)}</p>
            <p className="text-xs text-muted-foreground">
              {deal
                ? `${deal.profiles?.name || "Користувач"} · €${deal.amount} · ${deal.title}`
                : "Завантаження…"}
            </p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground mb-4">Оберіть причину спору:</p>
            {reasons.map((r) => {
              const selected = reason === r;
              return (
                <button
                  key={r}
                  onClick={() => { void tap("light"); setReason(r); }}
                  className={`w-full text-left p-4 rounded-2xl border min-h-[44px] flex items-center gap-3 transition-all duration-150 hover:-translate-y-px ${
                    selected
                      ? "border-destructive bg-destructive/5 text-foreground font-medium"
                      : "border-border text-foreground"
                  }`}
                >
                  {selected ? (
                    <CircleDot className="w-5 h-5 text-destructive shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  )}
                  <span className="text-sm">{r}</span>
                </button>
              );
            })}
            <Button
              className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-white min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
              disabled={!reason}
              onClick={() => { void tap("light"); setStep(2); }}
            >
              Далі →
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Опишіть ситуацію детально *
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Розкажіть що сталось, коли, які докази є…"
                rows={5}
                className="w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-accent/30 leading-relaxed"
              />
            </div>
            <div className="relative border-2 border-dashed border-border rounded-2xl p-6 text-center overflow-hidden">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" strokeWidth={1.75} />
              <p className="text-sm text-muted-foreground">Прикріпити скріншоти або документи</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF до 10MB</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 transition-transform duration-150 hover:-translate-y-px"
                onClick={() => { void tap("light"); setStep(1); }}
                disabled={submitting}
              >
                Назад
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white transition-transform duration-150 hover:-translate-y-px"
                disabled={!desc || submitting}
                onClick={submit}
              >
                {submitting ? "Подання…" : "Подати спір"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Dispute;
