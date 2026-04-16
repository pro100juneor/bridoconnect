import { useNavigate } from "react-router-dom";
import { Shield, Upload, CheckCircle, Clock, FileText, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const steps = [
  { icon: FileText, title: "Документ, що посвідчує особу", desc: "Паспорт, ID-картка або посвідка на проживання" },
  { icon: Camera, title: "Селфі з документом", desc: "Чітке фото вашого обличчя поруч з документом" },
  { icon: Shield, title: "Підтвердження адреси", desc: "Комунальний рахунок або банківська виписка" },
];

const VerificationPage = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-warning"/>
        </div>
        <h2 className="font-serif text-2xl text-foreground mb-2">Документи на перевірці</h2>
        <p className="text-muted-foreground text-sm mb-6">Команда Trust & Safety перевірить ваші документи протягом 24 годин.</p>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white" onClick={() => navigate("/app/profile")}>
          До профілю
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-12 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-8 h-8 text-accent"/>
          <h1 className="font-serif text-2xl text-foreground">Верифікація акаунту</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-8">Верифіковані акаунти отримують значок довіри і мають пріоритет у стрічці.</p>
        <div className="space-y-3 mb-8">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <step.icon className="w-5 h-5 text-accent"/>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground mb-0.5">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
              <div className="border-2 border-dashed border-border rounded-lg p-2 cursor-pointer hover:border-accent transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground"/>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-success/10 rounded-xl mb-6 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5"/>
          <div>
            <p className="text-sm font-semibold text-foreground">Ваші дані захищені</p>
            <p className="text-xs text-muted-foreground">Документи зберігаються зашифровано відповідно до GDPR.</p>
          </div>
        </div>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white" onClick={() => setSubmitted(true)}>
          Надіслати документи
        </Button>
      </div>
    </div>
  );
};
export default VerificationPage;
