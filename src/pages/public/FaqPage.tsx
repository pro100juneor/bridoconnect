import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <main className="min-h-screen bg-background">
      <section className="px-6 py-12 max-w-2xl mx-auto">
        <h1 className="font-serif text-4xl tracking-tight text-foreground mb-2 animate-fade-in">Часті питання</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">Відповіді на найпоширеніші запитання про BridoConnect.</p>

        <div className="space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <article
                key={i}
                className="relative rounded-2xl border border-border overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-4 min-h-[44px] text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-foreground text-sm pr-4">{faq.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 25 }}
                    className="shrink-0"
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={reduced ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={reduced ? { duration: 0 } : { ease: [0.4, 0, 0.2, 1], duration: 0.28 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
};
export default FaqPage;
