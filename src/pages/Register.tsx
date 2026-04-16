import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, UserPlus, CheckCircle } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form"|"success">("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "sponsor" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Паролі не збігаються"); return; }
    if (form.password.length < 6) { setError("Пароль має бути мінімум 6 символів"); return; }
    setError("");
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
      setError(error.message === "User already registered" ? "Цей email вже зареєстровано" : error.message);
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
        <Button className="w-full bg-accent hover:bg-accent/90 text-white" onClick={() => navigate("/auth")}>
          До входу
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
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Я хочу</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "sponsor", label: "Допомагати", emoji: "🤝" },
              { value: "recipient", label: "Отримати допомогу", emoji: "🙏" },
            ].map(r => (
              <button key={r.value} type="button" onClick={() => setForm({...form, role: r.value})}
                className={`p-3 rounded-xl border text-sm font-medium transition-colors ${form.role === r.value ? "border-accent bg-accent/10 text-accent" : "border-border text-foreground"}`}>
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Ім'я</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
            placeholder="Ваше ім'я"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
            placeholder="your@email.com"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground" />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Пароль</label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
              placeholder="Мінімум 6 символів"
              className="w-full bg-secondary rounded-xl px-4 py-3 pr-12 text-sm outline-none text-foreground placeholder:text-muted-foreground" />
            <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Підтвердіть пароль</label>
          <input type="password" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} required
            placeholder="Повторіть пароль"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground" />
          {form.confirm && form.password !== form.confirm && (
            <p className="text-xs text-destructive mt-1">Паролі не збігаються</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive">{error}</div>
        )}

        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white gap-2" disabled={loading}>
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
          {loading ? "Реєструємо..." : "Зареєструватись"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Вже є акаунт?{" "}
        <Link to="/auth" className="text-accent font-medium">Увійти</Link>
      </p>
    </div>
  );
};

export default Register;
