import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, KeyRound, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password?type=recovery",
    });
    setLoading(false);
    if (error) {
      toast({ title: "Помилка", description: error.message, variant: "destructive" });
    } else {
      setStep("sent");
    }
  };

  if (step === "sent") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-serif text-2xl text-foreground mb-2">Перевірте пошту</h2>
        <p className="text-muted-foreground text-sm mb-2">Ми надіслали посилання відновлення на:</p>
        <p className="font-semibold text-foreground mb-6">{email}</p>
        <p className="text-xs text-muted-foreground mb-6">Не отримали? Перевірте папку Спам або спробуйте знову.</p>
        <Button variant="outline" className="w-full mb-3" onClick={() => setStep("email")}>Надіслати знову</Button>
        <button className="text-sm text-accent font-medium" onClick={() => navigate("/auth")}>
          Повернутись до входу
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-12 bg-background">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground mb-8 self-start">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>
      <div className="flex items-center gap-3 mb-2">
        <KeyRound className="w-7 h-7 text-accent" />
        <h1 className="font-serif text-2xl text-foreground">Відновлення пароля</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-8">Введіть email вашого акаунту і ми надішлемо посилання для відновлення.</p>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="your@email.com"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30" />
        </div>
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white h-12" disabled={!email || loading}>
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : null}
          {loading ? "Надсилаємо..." : "Надіслати посилання"}
        </Button>
        <button type="button" className="w-full text-sm text-muted-foreground text-center" onClick={() => navigate("/auth")}>
          Повернутись до входу
        </button>
      </form>
    </div>
  );
};
export default ResetPassword;
