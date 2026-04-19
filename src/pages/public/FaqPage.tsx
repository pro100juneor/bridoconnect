import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Як BridoConnect захищає мої гроші?",
    a: "Кошти резервуються в системі до підтвердження угоди обома сторонами. Якщо угода не виконана — кошти повертаються донору протягом 3–5 робочих днів. Усі транзакції захищені Stripe."
  },
  {
    q: "Яка комісія платформи?",
    a: "Стандартна комісія — 5%. Для Premium користувачів — 0%. Комісія покриває витрати на верифікацію, підтримку та безпеку платформи."
  },
  {
    q: "Як верифікувати свій акаунт?",
    a: "Перейдіть до розділу Верифікація і завантажте документ, що посвідчує особу, та селфі з ним. Наша команда перевірить документи протягом 24 годин."
  },
  {
    q: "Хто може подати запит на допомогу?",
    a: "Будь-яка людина, яка опинилась у складній ситуації — внаслідок війни, стихійного лиха, хвороби або інших обставин. Для отримання допомоги потрібна верифікація акаунту."
  },
  {
    q: "Як відбувається перевірка запитів?",
    a: "Кожен запит проходить автоматичну та ручну перевірку нашою командою Trust & Safety. Верифіковані акаунти мають значок і пріоритет у стрічці."
  },
  {
    q: "Чи можна допомогти товарами, а не грошима?",
    a: "Так. У розділі Магазин верифіковані організації та волонтери розміщують товари — одяг, їжу, ліки. Ви можете замовити доставку напряму одержувачу."
  },
  {
    q: "Як працює прямий ефір?",
    a: "Одержувачі можуть запустити прямий ефір щоб показати свою ситуацію. Глядачі відправляють донати прямо під час трансляції. Кошти зараховуються миттєво."
  },
  {
    q: "Що таке BridoConnect Premium?",
    a: "Преміум підписка прибирає комісію платформи (0% замість 5%), дає пріоритет у стрічці, золотий значок верифікації та доступ до розширеної аналітики."
  },
  {
    q: "Як вивести кошти?",
    a: "Кошти можна вивести на банківський рахунок або карту. Мінімальна сума виведення — €10. Зарахування відбувається протягом 1–3 робочих днів."
  },
  {
    q: "BridoConnect — офіційна організація?",
    a: "Так. BridoConnect GmbH зареєстрована в Німеччині (Frankfurt am Main). Ми діємо відповідно до законодавства ЄС та GDPR."
  },
];

const FaqPage = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-12 max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl text-foreground mb-2">Часті питання</h1>
        <p className="text-muted-foreground mb-8">Відповіді на найпоширеніші запитання про BridoConnect.</p>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-4 text-left">
                <span className="font-medium text-foreground text-sm pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
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
