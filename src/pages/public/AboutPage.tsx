import { Heart, Globe, Shield, Users } from "lucide-react";

const team = [
  { name: "Олексій Юненко", role: "Засновник & CEO", flag: "🇺🇦" },
  { name: "Sophie Müller", role: "CTO", flag: "🇩🇪" },
  { name: "Mariam Al-Rashid", role: "COO", flag: "🇯🇴" },
  { name: "Тарас Мельник", role: "Head of Trust & Safety", flag: "🇺🇦" },
];

const values = [
  { icon: Heart, title: "Людяність", desc: "Кожна людина заслуговує на гідну допомогу без бюрократії." },
  { icon: Shield, title: "Довіра", desc: "Верифікація, захист угод і прозорість — основа платформи." },
  { icon: Globe, title: "Глобальність", desc: "Допомога без кордонів: від Харкова до Дамаску." },
  { icon: Users, title: "Спільнота", desc: "Ми будуємо мережу небайдужих людей по всьому світу." },
];

const AboutPage = () => (
  <div className="min-h-screen bg-background">
    <div className="px-6 py-16 max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl text-foreground mb-3">Про нас</h1>
      <p className="text-muted-foreground mb-10">BridoConnect заснована у 2024 році командою людей, яких торкнулась гуманітарна криза. Ми прибрали посередників між тими, хто хоче допомогти, і тими, хто цієї допомоги потребує.</p>

      <div className="grid grid-cols-2 gap-4 mb-12">
        {values.map(v => (
          <div key={v.title} className="p-4 rounded-xl bg-secondary border border-border">
            <v.icon className="w-6 h-6 text-accent mb-2" />
            <p className="font-semibold text-foreground text-sm mb-1">{v.title}</p>
            <p className="text-xs text-muted-foreground">{v.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-foreground text-lg mb-4">Команда</h2>
      <div className="space-y-3">
        {team.map(m => (
          <div key={m.name} className="flex items-center gap-3 p-3 rounded-xl border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
              {m.name.split(" ").map(n => n[0]).join("").slice(0,2)}
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{m.name} {m.flag}</p>
              <p className="text-xs text-muted-foreground">{m.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
export default AboutPage;
