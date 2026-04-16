import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const CreateDeal = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ title: "", category: "", amount: "", currency: "EUR", description: "", urgent: false });

  const categories = ["Житло та оренда", "Їжа та продукти", "Ліки та медицина", "Одяг та речі", "Транспорт", "Освіта", "Завдання/послуги", "Інше"];

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button onClick={() => step > 1 ? setStep(s => s-1) : navigate(-1)}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1">Нова угода</h2>
        <span className="text-xs text-muted-foreground">{step}/3</span>
      </div>

      <div className="flex gap-0 mx-4 mt-4 mb-6 rounded-full overflow-hidden bg-secondary h-1.5">
        {[1,2,3].map(s => <div key={s} className={`flex-1 transition-colors ${s <= step ? "bg-accent" : ""}`} />)}
      </div>

      <div className="px-4 space-y-4">
        {step === 1 && (
          <>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Назва запиту *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="Наприклад: Допомога з орендою квартири"
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Категорія *</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setForm({...form, category: cat})}
                    className={`p-3 rounded-xl text-xs font-medium text-left border transition-colors ${form.category === cat ? "border-accent bg-accent/10 text-accent" : "border-border bg-secondary text-foreground"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer">
              <input type="checkbox" checked={form.urgent} onChange={e => setForm({...form, urgent: e.target.checked})} className="w-4 h-4" />
              <div>
                <p className="text-sm font-medium text-foreground">🔴 Терміново</p>
                <p className="text-xs text-muted-foreground">Запит буде виділено на стрічці</p>
              </div>
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Сума потреби *</label>
              <div className="flex gap-2">
                <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                  placeholder="0.00" className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground" />
                <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}
                  className="bg-secondary rounded-xl px-3 text-sm outline-none text-foreground">
                  <option>EUR</option><option>USD</option><option>UAH</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Опис ситуації *</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Розкажіть про свою ситуацію. Чим більше деталей — тим більше довіри від спонсорів."
                rows={5} className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground resize-none" />
            </div>
          </>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-secondary border border-border">
              <h3 className="font-semibold text-foreground mb-3">Перевірте запит</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Назва:</span><span className="text-foreground font-medium">{form.title || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Категорія:</span><span className="text-foreground">{form.category || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Сума:</span><span className="text-foreground font-semibold">{form.amount ? `${form.amount} ${form.currency}` : "—"}</span></div>
                {form.urgent && <div className="flex justify-between"><span className="text-muted-foreground">Пріоритет:</span><span className="text-accent font-medium">🔴 Терміново</span></div>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">Після публікації запит буде перевірено модератором протягом 24 годин</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {step > 1 && <Button variant="outline" className="flex-1" onClick={() => setStep(s => s-1)}>Назад</Button>}
          <Button className="flex-1 bg-accent hover:bg-accent/90 text-white"
            onClick={() => step < 3 ? setStep(s => s+1) : navigate("/app")}>
            {step === 3 ? "Опублікувати" : "Далі →"}
          </Button>
        </div>
      </div>
    </div>
  );
};
export default CreateDeal;
