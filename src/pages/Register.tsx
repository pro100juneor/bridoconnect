import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, UserPlus, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form"|"success">("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "sponsor" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast({ title: "Паролі не збігаються", variant: "destructive" }); return; }
    if (form.password.length < 6) { toast({ title: "Пароль має бути мінімум 6 символів", variant: "destructive" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { name: form.name, role: form.role },
        emailRedirectTo: window.location.origin + "/app",
      }
    });
    setLoading(false);
    if (error) {
      toast({
        title: "Помилка реєстрації",
        description: error.message === "User already registered" ? "Цей email вже зареєстровано" : error.message,
        variant: "destructive",
      });
    } else {
      setStep("success");
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h2 className="font-serif text-2xl text-foreground mb-2">Майже готово!</h2>
        <p className="text-muted-foreground text-sm mb-2">Ми надіслали лист підтвердження на:</p>
        <p className="font-semibold text-foreground mb-6">{form.email}</p>
        <p className="text-xs text-muted-foreground mb-6">Підтвердіть email і потім увійдіть в акаунт.</p>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white h-12" onClick={() => navigate("/auth")}>
          До входу →
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-12 pb-8 bg-background">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-foreground mb-2">Реєстрація</h1>
        <p className="text-muted-foreground text-sm">Приєднатись до BridoConnect</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Я хочу</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "sponsor", label: "🤝 Допомагати" },
              { value: "recipient", label: "🙏 Отримати допомогу" },
            ].map(r => (
              <button key={r.value} type="button" onClick={() => setForm({...form, role: r.value})}
                className={`p-3 rounded-xl border text-sm font-medium transition-colors ${form.role === r.value ? "border-accent bg-accent/10 text-accent" : "border-border text-foreground"}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Ім'я</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
            placeholder="Ваше ім'я" autoComplete="name"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
            placeholder="your@email.com" autoComplete="email"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Пароль</label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
              placeholder="Мінімум 6 символів" autoComplete="new-password"
              className="w-full bg-secondary rounded-xl px-4 py-3 pr-12 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30" />
            <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Підтвердіть пароль</label>
          <input type="password" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} required
            placeholder="Повторіть пароль" autoComplete="new-password"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30" />
          {form.confirm && form.password !== form.confirm && (
            <p className="text-xs text-destructive mt-1">Паролі не збігаються</p>
          )}
        </div>

        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white gap-2 h-12" disabled={loading}>
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {loading ? "Реєструємо..." : "Зареєструватись"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-5">
        Вже є акаунт?{" "}
        <Link to="/auth" className="text-accent font-semibold">Увійти</Link>
      </p>
    </div>
  );
};
export default Register;
