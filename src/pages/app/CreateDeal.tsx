import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeals } from "@/hooks/useDeals";
import { useAuth } from "@/contexts/AuthContext";
import { Confetti } from "@/components/Confetti";
import { tap, notify } from "@/lib/native";

const CreateDeal = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const { createDeal } = useDeals();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", amount: "", currency: "EUR", description: "", urgent: false });
  const categories = ["Житло та оренда", "Їжа та продукти", "Ліки та медицина", "Одяг та речі", "Транспорт", "Освіта", "Завдання/послуги", "Інше"];

  const handlePublish = async () => {
    if (!user) return;
    setSaving(true);
    void tap("medium");
    const { error } = await createDeal({
      creator_id: user.id,
      title: form.title,
      description: form.description,
      category: form.category,
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      status: "pending",
      urgent: form.urgent,
    });
    setSaving(false);
    if (!error) {
      void notify("success");
      setDone(true);
    } else {
      void notify("error");
    }
  };

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate("/app"), 2500);
    return () => clearTimeout(t);
  }, [done, navigate]);

  // DESIGN.md §Animation: layoutId morph between active progress segments.
  const stepTransition = reduced
    ? { duration: 0 }
    : { ease: [0.34, 1.56, 0.64, 1] as const, duration: 0.28 };

  return (
    <main className="pb-8 relative">
      <Confetti trigger={done && !reduced} />

      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate(-1))}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1">Нова угода</h2>
        <span className="text-xs text-muted-foreground">{step}/3</span>
      </div>

      <div className="flex gap-1 mx-4 mt-4 mb-6 h-1.5">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 rounded-full bg-secondary relative overflow-hidden">
            {s <= step && (
              <motion.div
                layoutId={`step-${s}-fill`}
                className="absolute inset-0 bg-accent rounded-full"
                transition={stepTransition}
              />
            )}
          </div>
        ))}
      </div>

      <div className="px-4 space-y-4">
        <AnimatePresence mode="wait" initial={false}>
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={reduced ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24 }}
              transition={stepTransition}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Назва запиту *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Наприклад: Допомога з орендою квартири"
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Категорія *</label>
                {/* DESIGN.md §Anti-patterns: break symmetric 2-col — first category spans full width as featured. */}
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat, idx) => (
                    <button
                      key={cat}
                      onClick={() => setForm({ ...form, category: cat })}
                      className={`p-3 rounded-2xl text-xs font-medium text-left border transition-all duration-150 hover:-translate-y-px min-h-[44px] ${
                        idx === 0 ? "col-span-2" : ""
                      } ${
                        form.category === cat
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 rounded-2xl border border-border cursor-pointer min-h-[44px] hover:bg-secondary/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.urgent}
                  onChange={(e) => setForm({ ...form, urgent: e.target.checked })}
                  className="w-4 h-4 accent-accent"
                />
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" aria-hidden="true" />
                    Терміново
                  </p>
                  <p className="text-xs text-muted-foreground">Запит буде виділено на стрічці</p>
                </div>
              </label>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={reduced ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24 }}
              transition={stepTransition}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Сума потреби *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
                  />
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="bg-secondary rounded-xl px-3 text-sm outline-none text-foreground"
                  >
                    <option>EUR</option><option>USD</option><option>UAH</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Опис ситуації *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Розкажіть про свою ситуацію. Чим більше деталей — тим більше довіри."
                  rows={5}
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground resize-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={reduced ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24 }}
              transition={stepTransition}
            >
              <div className="p-4 rounded-2xl bg-secondary border border-border">
                <h3 className="font-semibold text-foreground mb-3">Перевірте запит</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ["Назва", form.title || "—"],
                    ["Категорія", form.category || "—"],
                    ["Сума", form.amount ? `${form.amount} ${form.currency}` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}:</span>
                      <span className="text-foreground font-medium">{v}</span>
                    </div>
                  ))}
                  {form.urgent && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Пріоритет:</span>
                      <span className="text-foreground font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" aria-hidden="true" />
                        Терміново
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-4">Запит буде перевірено модератором протягом 24 годин</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button
              variant="outline"
              className="flex-1 transition-transform duration-150 hover:-translate-y-px"
              onClick={() => setStep((s) => s - 1)}
            >
              Назад
            </Button>
          )}
          <Button
            className="flex-1 bg-accent hover:bg-accent/90 text-white transition-transform duration-150 hover:-translate-y-px"
            disabled={saving || done || (step === 1 && (!form.title || !form.category))}
            onClick={() => (step < 3 ? setStep((s) => s + 1) : handlePublish())}
          >
            {done ? "Опубліковано ✓" : saving ? "Публікуємо…" : step === 3 ? "Опублікувати" : "Далі →"}
          </Button>
        </div>
      </div>
    </main>
  );
};
export default CreateDeal;
