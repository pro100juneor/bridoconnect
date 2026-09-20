import { BarChart3, Shield, FileText, Users, CheckCircle2 } from "lucide-react";
import { useT } from "@/i18n/useT";
import { usePlatformStats } from "@/hooks/usePlatformStats";

const principles = [
  { key: "transparency.principle1", text: "Комісія платформи: 5% від кожної угоди — публічно" },
  { key: "transparency.principle2", text: "Всі перекази проходять через ліцензованих платіжних провайдерів" },
  { key: "transparency.principle3", text: "Персональні дані зберігаються відповідно до GDPR" },
  { key: "transparency.principle4", text: "Верифікація документів перед отриманням статусу 'перевірено'" },
  // Было «Щомісячний публічний звіт про використання коштів» — такого звіту
  // не існує, обіцяти його не можна. Замінено на те, що справді так:
  // цифри вище рахуються з бази при кожному відкритті сторінки.
  {
    key: "transparency.principle5",
    text: "Цифри вище рахуються з бази даних у момент відкриття сторінки — вручну їх ніхто не вводить",
  },
];

const TransparencyPage = () => {
  // localeTag (uk-UA/en-GB/de-DE), а не locale: Intl ждёт BCP-47.
  const { t, localeTag } = useT();
  const { stats, loading, failed } = usePlatformStats();

  // Цифры собираются только из того, что реально вернула БД. Плитка, для
  // которой данных нет (ноль сделок, ни одного отзыва), не рисуется вообще —
  // лучше пустая страница, чем правдоподобная выдумка на «Прозорості».
  const tiles: Array<{
    key: string;
    label: string;
    value: string;
    sub: string;
    hero?: boolean;
    icon?: typeof BarChart3;
  }> = [];

  if (stats) {
    const nf = new Intl.NumberFormat(localeTag);
    const money = new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });

    if (stats.deals_completed > 0) {
      const since = stats.since
        ? new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric" }).format(new Date(stats.since))
        : "";
      tiles.push({
        key: "transparency.stat.volume",
        label: "Виплачено отримувачам",
        value: money.format(stats.volume_cents / 100),
        sub: since ? t("transparency.stat.volume.since", "з ") + since : "",
        hero: true,
        icon: BarChart3,
      });
      tiles.push({
        key: "transparency.stat.deals",
        label: "Завершених угод",
        value: nf.format(stats.deals_completed),
        sub: t("transparency.stat.deals.sub", "кошти передані"),
      });
    }

    if (stats.active_users > 0) {
      tiles.push({
        key: "transparency.stat.users",
        label: "Учасників угод",
        value: nf.format(stats.active_users),
        sub:
          stats.countries > 0
            ? `${t("transparency.stat.users.in", "у")} ${nf.format(stats.countries)} ${t("transparency.stat.users.countries", "країнах")}`
            : "",
        icon: Users,
      });
    }

    if (stats.avg_rating !== null && stats.reviews_count > 0) {
      tiles.push({
        key: "transparency.stat.rating",
        label: "Середня оцінка",
        value: `${stats.avg_rating.toFixed(2)} ★`,
        sub: `${t("transparency.stat.rating.from", "з")} ${nf.format(stats.reviews_count)} ${t("transparency.stat.rating.reviews", "відгуків")}`,
      });
    }
  }

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
        {tiles.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-10">
            {tiles.map((s) => (
              <article
                key={s.key}
                className={`relative p-4 rounded-2xl bg-secondary overflow-hidden transition-shadow duration-200 hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 ${
                  s.hero ? "col-span-2" : ""
                }`}
              >
                {s.icon && (
                  <s.icon
                    className={`${s.hero ? "w-6 h-6" : "w-5 h-5"} text-accent mb-2`}
                    strokeWidth={1.75}
                  />
                )}
                <p className={`font-bold text-foreground ${s.hero ? "text-3xl tracking-tight" : "text-2xl"}`}>
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground">{t(`${s.key}.label`, s.label)}</p>
                {s.sub && <p className="text-xs text-accent">{s.sub}</p>}
              </article>
            ))}
          </div>
        )}

        {/* Платформа молодая: пока ни одна угода не закрыта, показывать нечего.
            Говорим об этом прямо — это и есть прозрачность. */}
        {!loading && tiles.length === 0 && (
          <div className="mb-10 p-4 rounded-2xl bg-secondary">
            <p className="text-sm text-foreground leading-relaxed">
              {failed
                ? t("transparency.statsUnavailable", "Статистика тимчасово недоступна. Спробуйте пізніше.")
                : t(
                    "transparency.noStatsYet",
                    "Платформа щойно запущена — завершених угод поки немає. Щойно пройде перша, цифри з’являться тут автоматично: ми показуємо лише реальні дані з бази, без округлень і прикрас."
                  )}
            </p>
          </div>
        )}

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
