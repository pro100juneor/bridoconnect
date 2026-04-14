import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"login"|"forgot">("login");
  const navigate = useNavigate();

  if (mode === "forgot") return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button onClick={() => setMode("login")} className="mb-6 text-muted-foreground hover:text-foreground">← Назад</button>
        <h1 className="font-serif text-3xl mb-2">Скидання пароля</h1>
        <p className="text-muted-foreground mb-6">Введіть email для отримання посилання</p>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-accent mb-4"/>
        <button className="w-full py-3 rounded-xl font-bold text-white bg-accent">Надіслати код</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="font-serif font-bold text-2xl text-foreground">Brido<span className="text-accent">Connect</span></Link>
        </div>
        <h1 className="font-serif text-3xl text-foreground text-center mb-6">Вхід</h1>
        <div className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-accent transition-colors"/>
          <div className="relative">
            <input type={show ? "text" : "password"} value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Пароль" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-accent transition-colors pr-10"/>
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
            </button>
          </div>
          <button onClick={() => setMode("forgot")} className="text-xs text-accent font-medium">Забули пароль?</button>
          <button onClick={() => navigate("/app")} className="w-full py-3 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 transition-colors">Увійти</button>
          <div className="flex items-center gap-3"><div className="flex-1 h-px bg-border"/><span className="text-xs text-muted-foreground">або</span><div className="flex-1 h-px bg-border"/></div>
          <button className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">🍎 Увійти через Apple</button>
          <button className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">🔵 Увійти через Google</button>
          <div className="flex items-center gap-3"><div className="flex-1 h-px bg-border"/><span className="text-xs text-muted-foreground">або</span><div className="flex-1 h-px bg-border"/></div>
          <Link to="/register" className="w-full flex items-center justify-center py-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">Створити акаунт</Link>
        </div>
      </div>
    </div>
  );
}
