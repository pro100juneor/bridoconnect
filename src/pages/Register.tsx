import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, User, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function Register() {
  const [params] = useSearchParams();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"sponsor"|"executor">(params.get("role") as any || "sponsor");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const strength = pwd.length === 0 ? 0 : pwd.length < 6 ? 1 : pwd.length < 10 ? 2 : 3;
  const colors = ["","bg-destructive","bg-warning","bg-success"];

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex w-96 bg-foreground flex-col justify-between p-10 shrink-0">
        <Link to="/" className="font-serif font-bold text-xl text-white">Brido<span className="text-accent">Connect</span></Link>
        <div>
          <h2 className="font-serif text-3xl text-white mb-4 leading-snug">
            {role === "sponsor" ? "Допоможи людині напряму — без посередників" : "Отримай допомогу від тисяч людей по всьому ЄС"}
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-6">Безпечно. Верифіковано. Прозоро.</p>
          <div className="space-y-3">
            {["100% верифіковані профілі","Escrow-захист кожної угоди","Сервери в Німеччині (GDPR)","Підтримка 10 мовами"].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-white/60"><span className="text-green-400">✓</span>{f}</div>
            ))}
          </div>
        </div>
        <p className="text-white/20 text-xs">© 2026 BridoConnect GmbH, Deutschland</p>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-8 py-5 border-b border-border">
          <button onClick={() => step > 1 ? setStep(s => s-1) : navigate("/")} className="text-sm text-muted-foreground hover:text-foreground">← Назад</button>
          <div className="flex gap-1.5">
            {[1,2,3].map(i => <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i <= step ? "w-8 bg-accent" : "w-4 bg-muted"}`}/>)}
          </div>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Вже є акаунт</Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-10">
          <div className="w-full max-w-md">
            {step === 1 && (
              <div>
                <h1 className="font-serif text-3xl text-foreground mb-2">Ласкаво просимо</h1>
                <p className="text-muted-foreground mb-8">Оберіть свою роль на платформі</p>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {([["sponsor","Хочу допомагати","Знаходжу людей і допомагаю напряму",Heart],["executor","Потрібна допомога","Створюю профіль і отримую підтримку",User]] as const).map(([r,t,d,Icon]) => (
                    <button key={r} onClick={() => setRole(r)} className={`p-5 rounded-2xl border-2 text-left transition-all ${role === r ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"}`}>
                      <Icon className={`w-6 h-6 mb-3 ${role === r ? "text-accent" : "text-muted-foreground"}`}/>
                      <div className="font-semibold text-foreground text-sm mb-1">{t}</div>
                      <div className="text-xs text-muted-foreground">{d}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep(2)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-accent hover:bg-accent/90">Продовжити <ArrowRight className="w-4 h-4"/></button>
              </div>
            )}
            {step === 2 && (
              <div>
                <h1 className="font-serif text-3xl text-foreground mb-2">Контактні дані</h1>
                <p className="text-muted-foreground mb-8">Email для входу в систему</p>
                <div className="space-y-4">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:border-accent"/>
                  <div className="flex items-center gap-3"><div className="flex-1 h-px bg-border"/><span className="text-xs text-muted-foreground">або</span><div className="flex-1 h-px bg-border"/></div>
                  <button className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary">🍎 Увійти через Apple</button>
                  <button className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary">🔵 Увійти через Google</button>
                  <button onClick={() => email && setStep(3)} disabled={!email} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-accent disabled:opacity-50">Продовжити <ArrowRight className="w-4 h-4"/></button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div>
                <h1 className="font-serif text-3xl text-foreground mb-2">Ім'я та пароль</h1>
                <p className="text-muted-foreground mb-8">Як вас бачитимуть інші</p>
                <div className="space-y-4">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше ім'я" className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:border-accent"/>
                  <div className="relative">
                    <input type={show ? "text" : "password"} value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Пароль (мін. 8 символів)" className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:border-accent pr-10"/>
                    <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                  </div>
                  {pwd.length > 0 && <div className="flex gap-1">{[1,2,3].map(i => <div key={i} className={`flex-1 h-1 rounded-full ${i <= strength ? colors[strength] : "bg-muted"}`}/>)}</div>}
                  <button onClick={() => navigate("/app")} disabled={!name || pwd.length < 8} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-accent disabled:opacity-50">
                    {role === "executor" ? "Продовжити до верифікації" : "Створити акаунт"} <ArrowRight className="w-4 h-4"/>
                  </button>
                  <p className="text-xs text-muted-foreground text-center">
                    Реєструючись, ви погоджуєтесь з <Link to="/agb" className="text-accent hover:underline">Умовами</Link> та <Link to="/datenschutz" className="text-accent hover:underline">Політикою конфіденційності</Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
