import { BarChart3, Shield, FileText, Users } from "lucide-react";

const stats = [
  { label: "Загальна сума переказів", value: "€847,240", sub: "з листопада 2024" },
  { label: "Успішних угод", value: "3,847", sub: "завершено" },
  { label: "Активних користувачів", value: "12,340", sub: "у 28 країнах" },
  { label: "Середня оцінка", value: "4.87 ★", sub: "з 10,000+ відгуків" },
];

const TransparencyPage = () => (
  <div className="min-h-screen bg-background">
    <div className="px-6 py-16 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <Shield className="w-8 h-8 text-accent" />
        <h1 className="font-serif text-3xl text-foreground">Прозорість</h1>
      </div>
      <p className="text-muted-foreground mb-10">Ми публікуємо реальні дані про всі транзакції та операції платформи.</p>

      <div className="grid grid-cols-2 gap-4 mb-10">
        {stats.map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-secondary border border-border">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xs text-accent">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2"><FileText className="w-5 h-5 text-accent" /> Наші принципи</h2>
        {[
          "Комісія платформи: 5% від кожної угоди — публічно",
          "Всі перекази проходять через ліцензованих платіжних провайдерів",
          "Персональні дані зберігаються відповідно до GDPR",
          "Верифікація документів перед отриманням статусу 'перевірено'",
          "Щомісячний публічний звіт про використання коштів",
        ].map((p, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary">
            <div className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center text-xs mt-0.5">✓</div>
            <p className="text-sm text-foreground">{p}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);
export default TransparencyPage;
