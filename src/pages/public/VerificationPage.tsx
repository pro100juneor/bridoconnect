import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Shield, Upload, CheckCircle, Clock, FileText, Camera, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useVerification } from "@/hooks/useVerification";
import { useKyc } from "@/hooks/useKyc";
import { Confetti } from "@/components/Confetti";
import { tap, notify } from "@/lib/native";
import { toast } from "@/hooks/use-toast";

const steps = [
  {
    icon: FileText,
    title: "Документ, що посвідчує особу",
    desc: "Паспорт, ID-картка або посвідка на проживання",
    type: "id_document",
  },
  {
    icon: Camera,
    title: "Селфі з документом",
    desc: "Чітке фото вашого обличчя поруч з документом",
    type: "selfie",
  },
  {
    icon: Shield,
    title: "Підтвердження адреси",
    desc: "Комунальний рахунок або банківська виписка",
    type: "address_proof",
  },
];

const VerificationPage = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { uploadDocument, submitVerification, uploading } = useVerification();
  const { triggerKyc } = useKyc();
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);

  const handleSumsubKyc = async () => {
    void tap("medium");
    setKycLoading(true);
    try {
      const session = await triggerKyc("basic-kyc-level");
      toast({
        title: "Sumsub KYC",
        description: `Applicant ${session.applicantId.slice(0, 8)}… готовий. У production WebSDK відкривається з access_token.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "KYC unavailable";
      toast({ title: "Sumsub", description: msg, variant: "destructive" });
    } finally {
      setKycLoading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadDocument(file, type as any);
    if (!result?.error) {
      setUploaded((prev) => [...prev, type]);
      void tap("light");
      void notify("success");
    } else {
      void notify("error");
    }
  };

  const handleSubmit = async () => {
    void tap("medium");
    await submitVerification();
    void notify("success");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
        <Confetti trigger={!reduced} />
        <motion.div
          initial={reduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4"
        >
          <Clock className="w-8 h-8 text-warning" strokeWidth={1.75} />
        </motion.div>
        <h1 className="font-serif text-4xl tracking-tight text-foreground mb-2 animate-fade-in">
          Документи на перевірці
        </h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Команда Trust & Safety перевірить ваші документи протягом 24 годин.
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
          Верифіковані акаунти отримують значок довіри і мають пріоритет у стрічці.
        </p>
        <div className="space-y-3 mb-8">
          {steps.map((step, i) => {
            const done = uploaded.includes(step.type);
            return (
              <article
                key={i}
                className={`relative flex items-start gap-4 p-4 rounded-2xl border overflow-hidden transition-colors before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 ${
                  done ? "border-success bg-success/5" : "border-border"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-success/10" : "bg-accent/10"}`}
                >
                  {done ? (
                    <CheckCircle className="w-5 h-5 text-success" strokeWidth={1.75} />
                  ) : (
                    <step.icon className="w-5 h-5 text-accent" strokeWidth={1.75} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground mb-0.5">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
                <label
                  className={`border-2 border-dashed rounded-2xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-all duration-150 hover:-translate-y-px ${
                    done ? "border-success" : "border-border hover:border-accent"
                  }`}
                  aria-label={done ? "Завантажено" : `Завантажити ${step.title}`}
                >
                  {done ? (
                    <CheckCircle className="w-4 h-4 text-success" strokeWidth={1.75} />
                  ) : (
                    <Upload className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFile(e, step.type)}
                  />
                </label>
              </article>
            );
          })}
        </div>
        <div className="relative p-4 bg-success/10 rounded-2xl mb-6 flex items-start gap-3 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
          <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-semibold text-foreground">Ваші дані захищені</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Документи зберігаються зашифровано відповідно до GDPR.
            </p>
          </div>
        </div>
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-white min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          disabled={uploading || uploaded.length === 0}
          onClick={handleSubmit}
        >
          {uploading ? "Завантажуємо…" : `Надіслати документи (${uploaded.length}/3)`}
        </Button>

        <div className="relative my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">або</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button
          data-testid="sumsub-kyc"
          variant="outline"
          className="w-full min-h-[44px] gap-2 transition-transform duration-150 hover:-translate-y-px"
          disabled={kycLoading}
          onClick={handleSumsubKyc}
        >
          <ScanFace className="w-4 h-4" strokeWidth={1.75} />
          {kycLoading ? "Готуємо сесію…" : "Експрес-верифікація (Sumsub KYC)"}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
          Sumsub — швидша автоматична перевірка (2-5 хв). Без завантаження вручну.
        </p>
      </section>
    </main>
  );
};
export default VerificationPage;
