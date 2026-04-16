import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, KeyRound } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email"|"sent">("email");
  const [email, setEmail] = useState("");

  if (step === "sent") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-serif text-2xl text-foreground mb-2">Перевірте пошту</h2>
        <p className="text-muted-foreground text-sm mb-2">Ми надіслали посилання на відновлення на:</p>
        <p className="font-semibold text-foreground mb-6">{email}</p>
        <p className="text-xs text-muted-foreground mb-6">Не отримали? Перевірте папку "Спам" або спробуйте знову.</p>
        <Button variant="outline" className="w-full mb-3" onClick={() => setStep("email")}>Надіслати знову</Button>
        <button className="text-sm text-accent" onClick={() => navigate("/auth")}>Повернутись до входу</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground mb-8">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>
      <div className="flex items-center gap-3 mb-2">
        <KeyRound className="w-7 h-7 text-accent" />
        <h1 className="font-serif text-2xl text-foreground">Відновлення пароля</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-8">Введіть email вашого акаунту</p>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground" />
        </div>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white" disabled={!email}
          onClick={() => setStep("sent")}>
          Надіслати посилання
        </Button>
        <button className="w-full text-sm text-muted-foreground text-center" onClick={() => navigate("/auth")}>
          Повернутись до входу
        </button>
      </div>
    </div>
  );
};
export default ResetPassword;
