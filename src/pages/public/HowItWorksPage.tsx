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
    <div className="min-h-screen bg-background">
      <div className="px-6 py-16 max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl text-foreground mb-3">Як це працює</h1>
        <p className="text-muted-foreground mb-12">BridoConnect — прозора P2P платформа гуманітарної допомоги без посередників.</p>
        <div className="space-y-8">
          {steps.map(step => (
            <div key={step.num} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <step.icon className="w-6 h-6 text-accent" />
                </div>
                <div className="w-0.5 flex-1 bg-border mt-2" />
              </div>
              <div className="pb-8">
                <span className="text-xs font-bold text-accent tracking-widest">{step.num}</span>
                <h3 className="font-semibold text-lg text-foreground mt-1 mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white mt-4" onClick={() => navigate("/register")}>
          Почати зараз <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
export default HowItWorksPage;
