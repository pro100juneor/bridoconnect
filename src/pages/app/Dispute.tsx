import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Upload, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const reasons = [
  "Кошти не отримані",
  "Послуга не надана",
  "Неправдива інформація у запиті",
  "Підозра на шахрайство",
  "Технічна помилка",
  "Інша причина",
];

const Dispute = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [desc, setDesc] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!reason) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h2 className="font-serif text-2xl text-foreground mb-2">Спір відкрито</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Ваше звернення прийнято. Команда Trust & Safety розгляне його протягом 48 годин.
          Кошти заморожені до вирішення спору.
        </p>
        <div className="w-full p-4 rounded-xl bg-secondary border border-border mb-6 text-left">
          <p className="text-xs text-muted-foreground mb-1">Номер спору</p>
          <p className="font-mono font-semibold text-foreground">DSP-{id}-{Date.now().toString().slice(-6)}</p>
        </div>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white" onClick={() => navigate("/app/deals")}>
          До угод
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Відкрити спір</h2>
        <span className="text-xs text-muted-foreground">{step}/2</span>
      </div>

      <div className="flex gap-0 mx-4 mt-4 mb-6 rounded-full overflow-hidden bg-secondary h-1.5">
        {[1,2].map(s => <div key={s} className={`flex-1 transition-colors ${s <= step ? "bg-destructive" : ""}`} />)}
      </div>

      <div className="px-4">
        <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl mb-6">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Угода #{id}</p>
            <p className="text-xs text-muted-foreground">Оксана К. · €200 · Допомога з житлом</p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground mb-4">Оберіть причину спору:</p>
            {reasons.map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={`w-full text-left p-4 rounded-xl border transition-colors text-sm ${reason === r ? "border-destructive bg-destructive/5 text-foreground font-medium" : "border-border text-foreground"}`}>
                {reason === r ? "● " : "○ "}{r}
              </button>
            ))}
            <Button className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-white" disabled={!reason} onClick={() => setStep(2)}>
              Далі →
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Опишіть ситуацію детально *</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Розкажіть що сталось, коли, які докази є..."
                rows={5} className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground resize-none" />
            </div>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Прикріпити скріншоти або документи</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF до 10MB</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Назад</Button>
              <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-white" disabled={!desc} onClick={submit}>
                Подати спір
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default Dispute;
