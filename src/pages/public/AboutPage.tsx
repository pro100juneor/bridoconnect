import { Heart, Globe, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useT } from "@/i18n/useT";

// Здесь стоял список из четырёх сотрудников (Олексій Юненко CEO, Sophie Müller
// CTO, Mariam Al-Rashid COO, Тарас Мельник Head of Trust & Safety). Ни одного
// из этих людей не существует, а в Impressum указан один реальный владелец —
// Firma „Luftarbeiter“, Inh. Oleksii Kusov. Выдуманный штат на странице «Про нас»
// расходится с обязательными выходными данными и вводит в заблуждение
// (UWG §5). Список удалён; если появятся настоящие люди — возвращать сюда,
// сверяя с Impressum.
//
// Имена участников — собственные, не переводим (роль переводим отдельно).
const team: { name: string; role: string; roleKey?: string; flag: string }[] = [];

const values = [
  {
    icon: Heart,
    key: "about.value.humanity",
    title: "Людяність",
    desc: "Кожна людина заслуговує на гідну допомогу без бюрократії.",
    hero: true,
  },
  {
    icon: Shield,
    key: "about.value.trust",
    title: "Довіра",
    desc: "Верифікація, захист угод і прозорість — основа платформи.",
  },
  {
    icon: Globe,
    key: "about.value.global",
    title: "Глобальність",
    desc: "Допомога без кордонів: від Харкова до Дамаску.",
  },
  {
    icon: Users,
    key: "about.value.community",
    title: "Спільнота",
    desc: "Ми будуємо мережу небайдужих людей по всьому світу.",
  },
];

const AboutPage = () => {
  const { t } = useT();
  return (
    <main className="min-h-screen bg-background">
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h1 className="font-serif text-4xl tracking-tight text-foreground mb-3 animate-fade-in">
          {t("about.title", "Про нас")}
        </h1>
        {/* Было: «заснована у 2024 році командою людей». Проект ведёт один
            человек и запущен в 2026-м — интро приведено к факту. */}
        <p className="text-muted-foreground mb-10 leading-relaxed">
          {t(
            "about.intro",
            "BridoConnect — незалежний проєкт, а не благодійний фонд. Ми прибрали посередників між тими, хто хоче допомогти, і тими, хто цієї допомоги потребує: гроші йдуть напряму отримувачу, платформа лише забезпечує перевірку, захист угоди й переказ."
          )}
        </p>

        {/* DESIGN.md §Anti-patterns: break symmetric 2-col — Heart "Людяність" hero card spans both cols */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          {values.map((v) => (
            <article
              key={v.key}
              className={`relative p-4 rounded-2xl bg-secondary overflow-hidden transition-shadow duration-200 hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 ${
                v.hero ? "col-span-2" : ""
              }`}
            >
              <v.icon className={`${v.hero ? "w-8 h-8" : "w-6 h-6"} text-accent mb-2`} strokeWidth={1.75} />
              <p className={`font-semibold text-foreground mb-1 ${v.hero ? "text-base" : "text-sm"}`}>
                {t(`${v.key}.title`, v.title)}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`${v.key}.desc`, v.desc)}</p>
            </article>
          ))}
        </div>

        <h2 className="font-semibold text-foreground text-lg mb-4">
          {t("about.teamTitle", "Хто за цим стоїть")}
        </h2>
        {team.length === 0 && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {t(
              "about.teamSolo",
              "Платформу створює й підтримує одна людина — власник, вказаний у вихідних даних. Коли до проєкту приєднається команда, вона з’явиться тут поіменно."
            )}{" "}
            <Link to="/impressum" className="text-accent underline underline-offset-2">
              {t("about.teamImpressum", "Вихідні дані")}
            </Link>
          </p>
        )}
        <div className="space-y-3">
          {team.map((m) => (
            <article
              key={m.name}
              className="relative flex items-center gap-3 p-3 rounded-2xl border border-border overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                {m.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {m.name} {m.flag}
                </p>
                <p className="text-xs text-muted-foreground">{m.roleKey ? t(m.roleKey, m.role) : m.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};
export default AboutPage;
