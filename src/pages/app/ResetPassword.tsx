import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { tap, notify } from "@/lib/native";

const ResetPassword = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    void tap("medium");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password?type=recovery",
    });
    setLoading(false);
    if (error) {
      void notify("error");
      toast({ title: "Помилка", description: error.message, variant: "destructive" });
    } else {
      void notify("success");
      setStep("sent");
    }
  };

  if (step === "sent") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
        <motion.div
          initial={reduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"
        >
          <Mail className="w-8 h-8 text-primary" strokeWidth={1.75} />
        </motion.div>
        <h1 className="font-serif text-4xl tracking-tight text-foreground mb-2 animate-fade-in">Перевірте пошту</h1>
        <p className="text-muted-foreground text-sm mb-2 leading-relaxed">Ми надіслали посилання відновлення на:</p>
        <p className="font-semibold text-foreground mb-6">{email}</p>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          Не отримали? Перевірте папку Спам або спробуйте знову.
        </p>
        <Button
          variant="outline"
          className="w-full max-w-xs mb-3 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          onClick={() => setStep("email")}
        >
          Надіслати знову
        </Button>
        <button
          className="text-sm text-accent font-medium min-h-[44px] px-2"
          onClick={() => navigate("/auth")}
        >
          Повернутись до входу
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col px-6 pt-12 bg-background">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground mb-8 self-start min-h-[44px]"
        aria-label="Назад"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Назад
      </button>
      <div className="flex items-center gap-3 mb-2">
        <KeyRound className="w-7 h-7 text-accent" strokeWidth={1.75} />
        <h1 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">Відновлення пароля</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
        Введіть email вашого акаунту і ми надішлемо посилання для відновлення.
      </p>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
            className="w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-accent hover:bg-accent/90 text-white h-12 transition-transform duration-150 hover:-translate-y-px"
          disabled={!email || loading}
        >
          {loading ? (
            <motion.span
              animate={reduced ? {} : { opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 0.9 }}
            >
              Надсилаємо…
            </motion.span>
          ) : "Надіслати посилання"}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-muted-foreground text-center min-h-[44px]"
          onClick={() => navigate("/auth")}
        >
          Повернутись до входу
        </button>
      </form>
    </main>
  );
};
export default ResetPassword;
