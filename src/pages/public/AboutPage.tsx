import { Heart, Globe, Shield, Users } from "lucide-react";

const team = [
  { name: "Олексій Юненко", role: "Засновник & CEO", flag: "🇺🇦" },
  { name: "Sophie Müller", role: "CTO", flag: "🇩🇪" },
  { name: "Mariam Al-Rashid", role: "COO", flag: "🇯🇴" },
  { name: "Тарас Мельник", role: "Head of Trust & Safety", flag: "🇺🇦" },
];

const values = [
  { icon: Heart, title: "Людяність", desc: "Кожна людина заслуговує на гідну допомогу без бюрократії.", hero: true },
  { icon: Shield, title: "Довіра", desc: "Верифікація, захист угод і прозорість — основа платформи." },
  { icon: Globe, title: "Глобальність", desc: "Допомога без кордонів: від Харкова до Дамаску." },
  { icon: Users, title: "Спільнота", desc: "Ми будуємо мережу небайдужих людей по всьому світу." },
];

const AboutPage = () => (
  <main className="min-h-screen bg-background">
    <section className="px-6 py-16 max-w-2xl mx-auto">
      <h1 className="font-serif text-4xl tracking-tight text-foreground mb-3 animate-fade-in">Про нас</h1>
      <p className="text-muted-foreground mb-10 leading-relaxed">
        BridoConnect заснована у 2024 році командою людей, яких торкнулась гуманітарна криза.
        Ми прибрали посередників між тими, хто хоче допомогти, і тими, хто цієї допомоги потребує.
      </p>

      {/* DESIGN.md §Anti-patterns: break symmetric 2-col — Heart "Людяність" hero card spans both cols */}
      <div className="grid grid-cols-2 gap-4 mb-12">
        {values.map((v) => (
          <article
            key={v.title}
            className={`relative p-4 rounded-2xl bg-secondary overflow-hidden transition-shadow duration-200 hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 ${
              v.hero ? "col-span-2" : ""
            }`}
          >
            <v.icon className={`${v.hero ? "w-8 h-8" : "w-6 h-6"} text-accent mb-2`} strokeWidth={1.75} />
            <p className={`font-semibold text-foreground mb-1 ${v.hero ? "text-base" : "text-sm"}`}>{v.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
          </article>
        ))}
      </div>

      <h2 className="font-semibold text-foreground text-lg mb-4">Команда</h2>
      <div className="space-y-3">
        {team.map((m) => (
          <article
            key={m.name}
            className="relative flex items-center gap-3 p-3 rounded-2xl border border-border overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
              {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{m.name} {m.flag}</p>
              <p className="text-xs text-muted-foreground">{m.role}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  </main>
);
export default AboutPage;
