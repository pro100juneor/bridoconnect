import { useNavigate } from "react-router-dom";
import { Shield, Search, MessageCircle, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: Search, num: "01", title: "Знайди того, кому потрібна допомога", desc: "Переглядай верифіковані запити у стрічці. Фільтруй за категорією, країною або сумою." },
  { icon: MessageCircle, num: "02", title: "Напиши і домовся", desc: "Зв'яжись безпосередньо через захищений чат. Уточни деталі перед відправкою коштів." },
  { icon: Shield, num: "03", title: "Угода з захистом", desc: "Кошти резервуються у системі. Одержувач отримує тільки після підтвердження виконання." },
  { icon: CheckCircle, num: "04", title: "Підтвердження і відгук", desc: "Обидві сторони підтверджують угоду. Залиш відгук і продовжуй допомагати." },
];

const HowItWorksPage = () => {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-background">
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h1 className="font-serif text-4xl tracking-tight text-foreground mb-3 animate-fade-in">Як це працює</h1>
        <p className="text-muted-foreground mb-12 leading-relaxed">BridoConnect — прозора P2P платформа гуманітарної допомоги без посередників.</p>
        {/* Hero video placeholder — replace with Runway video */}
        <div className="relative w-full aspect-video bg-gradient-to-br from-primary/10 to-accent/5 rounded-2xl overflow-hidden mb-10 border border-border before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Дивитись як це працює</p>
            <p className="text-xs text-muted-foreground/60">2 хв</p>
          </div>
        </div>
        <ol className="space-y-8">
          {steps.map((step) => (
            <li key={step.num} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0 transition-shadow duration-200 hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)]">
                  <step.icon className="w-6 h-6 text-accent" strokeWidth={1.75} />
                </div>
                <div className="w-0.5 flex-1 bg-border mt-2" />
              </div>
              <div className="pb-8">
                <span className="text-sm font-bold text-accent tracking-widest">{step.num}</span>
                <h3 className="font-semibold text-lg text-foreground mt-1 mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-white mt-4 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          onClick={() => navigate("/register")}
        >
          Почати зараз <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.75} />
        </Button>
      </section>
    </main>
  );
};
export default HowItWorksPage;
