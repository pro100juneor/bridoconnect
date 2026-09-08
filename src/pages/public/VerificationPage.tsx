import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Shield, CheckCircle, Clock, FileText, ScanFace, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useIdentity, type VerificationStatus } from "@/hooks/useIdentity";
import { Confetti } from "@/components/Confetti";
import { tap, notify } from "@/lib/native";
import { toast } from "@/hooks/use-toast";

const steps = [
  {
    icon: FileText,
    title: "Документ, що посвідчує особу",
    desc: "Паспорт, ID-картка або посвідка на проживання — фото прямо в камеру",
  },
  {
    icon: ScanFace,
    title: "Selfie-перевірка",
    desc: "Коротка зйомка обличчя, автоматичне співставлення з документом",
  },
  {
    icon: Lock,
    title: "Дані лишаються у Stripe",
    desc: "Документи обробляє сертифікований провайдер Stripe Identity. BridoConnect не бачить і не зберігає скани",
  },
];

const VerificationPage = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { createSession, getStatus } = useIdentity();
  const [status, setStatus] = useState<VerificationStatus>("unverified");
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  };

  const startPolling = () => {
    if (pollRef.current) return;
    setPolling(true);
    pollRef.current = window.setInterval(async () => {
      const s = await getStatus();
      setStatus(s);
      if (s === "verified") {
        stopPolling();
        void notify("success");
      }
    }, 5000);
  };

  useEffect(() => {
    void getStatus().then((s) => {
      setStatus(s);
      if (s === "pending") startPolling();
    });
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = async () => {
    void tap("medium");
    setLoading(true);
    try {
      const session = await createSession();
      // Hosted-сторінка Stripe відкривається окремо (Safari/вкладка),
      // а тут чекаємо на вердикт від webhook.
      window.open(session.url, "_blank");
      setStatus("pending");
      startPolling();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Верифікація недоступна";
      toast({ title: "Stripe Identity", description: msg, variant: "destructive" });
      void notify("error");
    } finally {
      setLoading(false);
    }
  };

  if (status === "verified") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
        <Confetti trigger={!reduced} />
        <motion.div
          initial={reduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4"
        >
          <CheckCircle className="w-8 h-8 text-success" strokeWidth={1.75} />
        </motion.div>
        <h1 className="font-serif text-4xl tracking-tight text-foreground mb-2 animate-fade-in">
          Ви верифіковані
        </h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Значок довіри вже на вашому профілі. Дякуємо!
        </p>
        <Button
          className="w-full max-w-xs bg-accent hover:bg-accent/90 text-white min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          onClick={() => navigate("/app/profile")}
        >
          До профілю
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="px-6 py-12 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-8 h-8 text-accent" strokeWidth={1.75} />
          <h1 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">
            Верифікація акаунту
          </h1>
        </div>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Верифіковані акаунти отримують значок довіри і мають пріоритет у стрічці. Перевірка триває 2–5
          хвилин.
        </p>
        <div className="space-y-3 mb-8">
          {steps.map((step, i) => (
            <article
              key={i}
              className="relative flex items-start gap-4 p-4 rounded-2xl border border-border overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <step.icon className="w-5 h-5 text-accent" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground mb-0.5">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="relative p-4 bg-success/10 rounded-2xl mb-6 flex items-start gap-3 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
          <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-semibold text-foreground">Ваші дані захищені</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Перевірку виконує Stripe Identity (GDPR, PCI DSS). BridoConnect отримує лише результат
              «підтверджено / не підтверджено» — жодних копій документів.
            </p>
          </div>
        </div>

        {status === "pending" && (
          <div className="relative p-4 border border-warning/40 bg-warning/5 rounded-2xl mb-6 flex items-start gap-3">
            <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-semibold text-foreground">Перевірка триває</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Завершіть кроки на сторінці Stripe, що відкрилась.
                {polling ? " Статус оновиться тут автоматично." : ""}
              </p>
            </div>
          </div>
        )}

        <Button
          data-testid="identity-kyc"
          className="w-full bg-accent hover:bg-accent/90 text-white min-h-[44px] gap-2 transition-transform duration-150 hover:-translate-y-px"
          disabled={loading}
          onClick={handleStart}
        >
          <ScanFace className="w-4 h-4" strokeWidth={1.75} />
          {loading
            ? "Готуємо сесію…"
            : status === "pending"
              ? "Продовжити верифікацію"
              : "Пройти верифікацію"}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
          Натискаючи, ви погоджуєтесь на обробку даних Stripe Identity для підтвердження особи.
        </p>
      </section>
    </main>
  );
};
export default VerificationPage;
