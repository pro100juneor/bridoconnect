import { useNavigate } from "react-router-dom";
import { Shield, Upload, CheckCircle, Clock, FileText, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useVerification } from "@/hooks/useVerification";

const steps = [
  { icon: FileText, title: "Документ, що посвідчує особу", desc: "Паспорт, ID-картка або посвідка на проживання", type: "id_document" },
  { icon: Camera, title: "Селфі з документом", desc: "Чітке фото вашого обличчя поруч з документом", type: "selfie" },
  { icon: Shield, title: "Підтвердження адреси", desc: "Комунальний рахунок або банківська виписка", type: "address_proof" },
];

const VerificationPage = () => {
  const navigate = useNavigate();
  const { uploadDocument, submitVerification, uploading } = useVerification();
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadDocument(file, type as any);
    if (!result?.error) setUploaded(prev => [...prev, type]);
  };

  const handleSubmit = async () => {
    await submitVerification();
    setSubmitted(true);
  };

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
          {steps.map((step, i) => {
            const done = uploaded.includes(step.type);
            return (
              <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${done ? "border-success bg-success/5" : "border-border"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-success/10" : "bg-accent/10"}`}>
                  {done ? <CheckCircle className="w-5 h-5 text-success"/> : <step.icon className="w-5 h-5 text-accent"/>}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground mb-0.5">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
                <label className={`border-2 border-dashed rounded-lg p-2 cursor-pointer transition-colors ${done ? "border-success" : "border-border hover:border-accent"}`}>
                  {done ? <CheckCircle className="w-4 h-4 text-success"/> : <Upload className="w-4 h-4 text-muted-foreground"/>}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFile(e, step.type)} />
                </label>
              </div>
            );
          })}
        </div>
        <div className="p-4 bg-success/10 rounded-xl mb-6 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5"/>
          <div>
            <p className="text-sm font-semibold text-foreground">Ваші дані захищені</p>
            <p className="text-xs text-muted-foreground">Документи зберігаються зашифровано відповідно до GDPR.</p>
          </div>
        </div>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white" disabled={uploading || uploaded.length === 0} onClick={handleSubmit}>
          {uploading ? "Завантажуємо..." : `Надіслати документи (${uploaded.length}/3)`}
        </Button>
      </div>
    </div>
  );
};
export default VerificationPage;
