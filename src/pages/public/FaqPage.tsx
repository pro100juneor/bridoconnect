import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  { q: "Як BridoConnect захищає мої гроші?", a: "Кошти резервуються в системі до підтвердження угоди обома сторонами. Якщо угода не виконана — кошти повертаються донору протягом 3-5 робочих днів." },
  { q: "Яка комісія платформи?", a: "Стандартна комісія — 5% від суми угоди. Для Premium-користувачів — 0%. Комісія покриває верифікацію, захист транзакцій та підтримку." },
  { q: "Як верифікувати свій акаунт?", a: "Завантажте документ, що посвідчує особу (паспорт або ID-картка) та підтвердіть електронну пошту. Верифікація займає до 24 годин." },
  { q: "Чи можна допомагати анонімно?", a: "Так, ваше ім'я не відображається публічно без вашого дозволу. Одержувач бачить лише транзакцію, якщо ви не обрали 'показати ім'я'." },
  { q: "Які країни підтримуються?", a: "Платформа доступна у 28 країнах Європи та Близького Сходу. Переказ можливий через SEPA, PayPal, Stripe та криптовалюту." },
  { q: "Що робити у разі шахрайства?", a: "Натисніть 'Спір' в активній угоді. Наша команда Trust & Safety розгляне звернення протягом 48 годин і заморозить кошти до вирішення." },
];

const FaqPage = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-16 max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl text-foreground mb-3">Часті питання</h1>
        <p className="text-muted-foreground mb-10">Відповіді на найпоширеніші запитання про BridoConnect.</p>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-4 text-left"
              >
                <span className="font-medium text-foreground text-sm">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-2 ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default FaqPage;
