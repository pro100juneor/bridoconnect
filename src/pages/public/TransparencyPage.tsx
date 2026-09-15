import { BarChart3, Shield, FileText, Users, CheckCircle2 } from "lucide-react";
import { useT } from "@/i18n/useT";

const stats = [
  {
    key: "transparency.stat.volume",
    label: "Загальна сума переказів",
    value: "€847,240",
    sub: "з листопада 2024",
    hero: true,
    icon: BarChart3,
  },
  { key: "transparency.stat.deals", label: "Успішних угод", value: "3,847", sub: "завершено" },
  {
    key: "transparency.stat.users",
    label: "Активних користувачів",
    value: "12,340",
    sub: "у 28 країнах",
    icon: Users,
  },
  { key: "transparency.stat.rating", label: "Середня оцінка", value: "4.87 ★", sub: "з 10,000+ відгуків" },
];

const principles = [
  { key: "transparency.principle1", text: "Комісія платформи: 5% від кожної угоди — публічно" },
  { key: "transparency.principle2", text: "Всі перекази проходять через ліцензованих платіжних провайдерів" },
  { key: "transparency.principle3", text: "Персональні дані зберігаються відповідно до GDPR" },
  { key: "transparency.principle4", text: "Верифікація документів перед отриманням статусу 'перевірено'" },
  { key: "transparency.principle5", text: "Щомісячний публічний звіт про використання коштів" },
];

const TransparencyPage = () => {
  const { t } = useT();
  return (
    <main className="min-h-screen bg-background">
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-8 h-8 text-accent" strokeWidth={1.75} />
          <h1 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">
            {t("transparency.title", "Прозорість")}
          </h1>
        </div>
        <p className="text-muted-foreground mb-12 leading-relaxed">
          {t("transparency.intro", "Ми публікуємо реальні дані про всі транзакції та операції платформи.")}
        </p>

        {/* DESIGN.md §Anti-patterns: break symmetric 2-col — first stat hero col-span-2 */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {stats.map((s) => (
            <article
              key={s.key}
              className={`relative p-4 rounded-2xl bg-secondary overflow-hidden transition-shadow duration-200 hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 ${
                s.hero ? "col-span-2" : ""
              }`}
            >
              {s.icon && (
                <s.icon className={`${s.hero ? "w-6 h-6" : "w-5 h-5"} text-accent mb-2`} strokeWidth={1.75} />
              )}
              <p className={`font-bold text-foreground ${s.hero ? "text-3xl tracking-tight" : "text-2xl"}`}>
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground">{t(`${s.key}.label`, s.label)}</p>
              <p className="text-xs text-accent">{t(`${s.key}.sub`, s.sub)}</p>
            </article>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" strokeWidth={1.75} />{" "}
            {t("transparency.principlesTitle", "Наші принципи")}
          </h2>
          {principles.map((p) => (
            <article
              key={p.key}
              className="relative flex items-start gap-3 p-3 rounded-2xl bg-secondary overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
            >
              <CheckCircle2
                className="w-5 h-5 text-success shrink-0 mt-0.5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <p className="text-sm text-foreground leading-relaxed">{t(p.key, p.text)}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};
export default TransparencyPage;
