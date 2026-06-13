import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Shield, Eye, Users, Lock, CheckCircle, Plus } from "lucide-react";
import VideoHero from "@/components/VideoHero";

const recipients = [
  {
    name: "Оксана К.",
    flag: "🇺🇦",
    city: "Харків",
    need: "Відновлення житла",
    bio: "Будинок пошкоджений. Дві доньки. Потрібна допомога з ремонтом.",
    goal: 3200,
    raised: 1840,
    rating: 4.9,
    deals: 17,
  },
  {
    name: "Аміна Х.",
    flag: "🇸🇾",
    city: "Алеппо",
    need: "Протез ноги",
    bio: "Втратила ногу. Хоче повернутись до роботи вчителькою.",
    goal: 3200,
    raised: 2304,
    rating: 5.0,
    deals: 9,
  },
  {
    name: "Фатіма А.",
    flag: "🇦🇫",
    city: "Кабул",
    need: "Освіта для дівчат",
    bio: "Організовує підпільні уроки. Потрібні підручники.",
    goal: 1400,
    raised: 1232,
    rating: 4.8,
    deals: 23,
  },
  {
    name: "Ахмед М.",
    flag: "🇸🇾",
    city: "Дамаск",
    need: "Ліки та їжа",
    bio: "Батько трьох дітей. Потребує базової підтримки.",
    goal: 2400,
    raised: 960,
    rating: 4.7,
    deals: 5,
  },
  {
    name: "Надія Р.",
    flag: "🇺🇦",
    city: "Миколаїв",
    need: "Генератор",
    bio: "Медсестра. Потрібне автономне живлення для обладнання.",
    goal: 800,
    raised: 340,
    rating: 4.9,
    deals: 4,
  },
  {
    name: "Карім О.",
    flag: "🇸🇩",
    city: "Хартум",
    need: "Їжа та вода",
    bio: "Доглядає за батьками в зоні конфлікту.",
    goal: 600,
    raised: 180,
    rating: 4.6,
    deals: 3,
  },
];

// DESIGN.md §Cards: stacked shadow + inset-highlight.
const CARD_SHADOW = "shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)]";
const CARD_INSET =
  "relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:rounded-t-2xl";

const SECTIONS = [
  { id: "hero", label: "Головна" },
  { id: "how", label: "Як це працює" },
  { id: "recipients", label: "Люди" },
  { id: "transparency", label: "Прозорість" },
  { id: "cta", label: "Приєднатись" },
];

export default function HomePage() {
  const reduced = useReducedMotion();
  const [ri, setRi] = useState(0);
  const [activeSection, setActiveSection] = useState("hero");

  // Track which section is currently in viewport for the side-dot indicator.
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting && e.intersectionRatio > 0.3) {
              setActiveSection(s.id);
            }
          }
        },
        { threshold: [0.3, 0.6] }
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  const r = recipients[ri];
  const pct = Math.round((r.raised / r.goal) * 100);

  // Hero title word-stagger (DESIGN.md §Animation).
  const heroWords = ["Допомога", "від", "людини —"];
  const wordVariant = (i: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.05 + i * 0.07, ease: [0.34, 1.56, 0.64, 1] as const, duration: 0.5 },
        };

  // Reusable: fade-in-on-scroll wrapper.
  const InView = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );

  return (
    <div className="relative">
      {/* Sticky in-page nav bar — vertical-scroll affordance with button taps to jump */}
      <nav
        aria-label="Розділи"
        className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border"
      >
        <div className="max-w-5xl mx-auto px-4 py-2 overflow-x-auto scrollbar-hide">
          <ul className="flex items-center gap-1 sm:gap-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => jumpTo(s.id)}
                  className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 hover:-translate-y-px ${
                    activeSection === s.id
                      ? "bg-accent text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* SECTION 1: HERO */}
      <section
        id="hero"
        className="relative overflow-hidden min-h-[calc(100vh-110px)] flex items-center"
        style={{ background: "linear-gradient(135deg,#0f3460,#16213e,#060f20)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-red-500" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 w-full grid lg:grid-cols-2 gap-8 lg:gap-12 items-center py-12">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-xs text-white/70 font-medium"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Зараз 0 прямих ефірів · Платформа запускається
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-5">
              {heroWords.map((w, i) => (
                <motion.span key={i} className="inline-block mr-3" {...wordVariant(i)}>
                  {w}
                </motion.span>
              ))}
              <br />
              <motion.em
                className="not-italic"
                style={{ color: "#e94560" }}
                {...wordVariant(heroWords.length)}
              >
                людині
              </motion.em>
            </h1>
            <p className="text-base text-white/60 leading-relaxed mb-8 max-w-md">
              Обери верифіковану людину і допоможи напряму. Без анонімних фондів. Без посередників. Ти бачиш
              результат.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                to="/register"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-transform duration-150 hover:-translate-y-px min-h-[44px]"
                style={{ background: "#e94560" }}
              >
                Почати допомагати →
              </Link>
              <Link
                to="/register?role=executor"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white/80 transition-transform duration-150 hover:-translate-y-px min-h-[44px]"
                style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)" }}
              >
                Мені потрібна допомога
              </Link>
            </div>
            <div className="flex gap-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              {[
                ["0", "ефірів зараз"],
                ["5%", "комісія"],
                ["24 год", "верифікація"],
              ].map(([v, l]) => (
                <div key={l}>
                  <div className="text-xl font-bold text-white">{v}</div>
                  <div className="text-xs text-white/35 uppercase tracking-wider">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block">
            <VideoHero variant="hero" />
          </div>
        </div>
      </section>

      {/* SECTION 2: HOW IT WORKS */}
      <section id="how" className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <InView className="text-left mb-12 border-l-2 border-accent pl-4">
            <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-3">
              Як це працює
            </span>
            <h2 className="font-serif text-4xl text-foreground tracking-tight">
              Три кроки до <em className="not-italic text-accent">реальної допомоги</em>
            </h2>
          </InView>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1.5fr] gap-6">
            {[
              {
                n: "01",
                icon: Users,
                t: "Знайди людину",
                d: "Переглянь профілі верифікованих отримувачів. Читай реальні історії та рейтинг. Обирай сам, без посередників.",
                tag: "Лише верифіковані",
                extended: "Кожен профіль перевірений — документи, фото, історія.",
              },
              {
                n: "02",
                icon: CheckCircle,
                t: "Обери формат",
                d: "Переведи гроші, купи товар зі списку або постав завдання. 95% суми доходить до людини.",
                tag: "95% отримувачу",
              },
              {
                n: "03",
                icon: Eye,
                t: "Отримай підтвердження",
                d: "Фото і відео після виконання. Escrow захищає тебе.",
                tag: "Прозоро і публічно",
              },
            ].map((s, idx) => (
              <InView key={s.n}>
                <div
                  className={`bg-card border border-border rounded-2xl p-6 transition-all duration-200 hover:-translate-y-px hover:${CARD_SHADOW} ${CARD_INSET}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(233,69,96,0.1)" }}
                    >
                      <s.icon className="w-5 h-5 text-accent" strokeWidth={1.75} />
                    </div>
                    <span
                      className={`font-serif text-accent/20 font-bold ${idx === 0 ? "text-5xl" : "text-3xl"}`}
                    >
                      {s.n}
                    </span>
                  </div>
                  <h3 className={`font-semibold text-foreground mb-2 ${idx === 0 ? "text-xl" : "text-lg"}`}>
                    {s.t}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.d}</p>
                  {s.extended && (
                    <p className="text-xs text-muted-foreground/70 leading-relaxed mb-4 italic">
                      {s.extended}
                    </p>
                  )}
                  <span
                    className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: "rgba(233,69,96,0.08)", color: "#e94560" }}
                  >
                    {s.tag}
                  </span>
                </div>
              </InView>
            ))}
          </div>
          <InView className="text-left mt-8">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors min-h-[44px]"
            >
              Детальніше про процес →
            </Link>
          </InView>
        </div>
      </section>

      {/* SECTION 3: RECIPIENTS */}
      <section id="recipients" className="py-20 bg-secondary">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <InView className="text-left mb-8 border-l-2 border-accent pl-4">
            <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-3">
              Реальні люди
            </span>
            <h2 className="font-serif text-4xl text-foreground tracking-tight">
              Тобі можуть <em className="not-italic text-accent">допомогти</em>
            </h2>
          </InView>
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <InView
              className={`bg-card border border-border rounded-2xl overflow-hidden ${CARD_INSET} ${CARD_SHADOW}`}
            >
              <div
                className="h-36 flex items-center justify-center relative"
                style={{ background: "linear-gradient(135deg,rgba(15,52,96,0.7),rgba(15,52,96,0.9))" }}
              >
                <span className="text-6xl opacity-30">{r.flag}</span>
                <div className="absolute bottom-3 left-3">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium text-white"
                    style={{ background: "rgba(29,138,90,0.9)" }}
                  >
                    ✓ Верифіковано
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-foreground text-lg">
                      {r.name} {r.flag}
                    </h3>
                    <p className="text-xs text-muted-foreground">{r.city}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium">⭐ {r.rating}</div>
                    <div className="text-xs text-muted-foreground">{r.deals} угод</div>
                  </div>
                </div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2 text-accent">{r.need}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{r.bio}</p>
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold">€{r.raised.toLocaleString()}</span>
                    <span className="text-muted-foreground">з €{r.goal.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <Link
                  to="/register"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-transform duration-150 hover:-translate-y-px min-h-[44px]"
                  style={{ background: "#e94560" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Допомогти {r.name.split(" ")[0]}
                </Link>
              </div>
            </InView>
            <div className="space-y-2">
              {recipients.map((rec, i) => (
                <button
                  key={rec.name}
                  onClick={() => setRi(i)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all min-h-[44px] hover:-translate-y-px duration-150 ${i === ri ? "border-accent bg-accent/5" : "border-border bg-card hover:border-accent/40"}`}
                >
                  <span className="text-2xl">{rec.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {rec.name} · {rec.city}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{rec.need}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round((rec.raised / rec.goal) * 100)}%
                  </div>
                </button>
              ))}
              <Link
                to="/register?role=executor"
                className="w-full flex items-center justify-center py-2.5 rounded-2xl border border-border text-sm font-medium hover:bg-secondary transition-colors mt-2 min-h-[44px]"
              >
                Зареєструватись і опублікувати профіль →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: TRANSPARENCY */}
      <section id="transparency" className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <InView className="text-left mb-10 border-l-2 border-accent pl-4">
            <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-3">
              Безпека і прозорість
            </span>
            <h2 className="font-serif text-4xl text-foreground tracking-tight">
              Кожен цент <em className="not-italic text-accent">на виду</em>
            </h2>
          </InView>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-5 mb-8">
            {[
              {
                icon: Shield,
                n: "100%",
                l: "Верифіковані",
                d: "Кожен отримувач проходить перевірку документів. Жодного анонімного профілю.",
                anchor: true,
              },
              {
                icon: Lock,
                n: "AES-256",
                l: "Шифрування",
                d: "Дані зашифровані. Сервери в Німеччині (AWS Frankfurt). Повна відповідність GDPR.",
              },
              {
                icon: Eye,
                n: "98%",
                l: "Доходить",
                d: "98% угод завершуються успішно. Публічна історія кожної транзакції.",
              },
              {
                icon: CheckCircle,
                n: "5%",
                l: "Комісія",
                d: "Лише 5% від суми. Покриває верифікацію, escrow і безпеку платежів.",
              },
            ].map((p) => (
              <InView key={p.n}>
                <div
                  className={`bg-card border border-border rounded-2xl p-5 transition-all duration-200 hover:-translate-y-px ${CARD_SHADOW} ${CARD_INSET} ${p.anchor ? "lg:p-6" : ""}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(233,69,96,0.1)" }}
                  >
                    <p.icon className="w-5 h-5 text-accent" strokeWidth={1.75} />
                  </div>
                  <div className={`font-bold text-foreground ${p.anchor ? "text-3xl" : "text-2xl"}`}>
                    {p.n}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5 mb-3">
                    {p.l}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.d}</p>
                </div>
              </InView>
            ))}
          </div>
          <InView className={`bg-secondary rounded-2xl p-6 ${CARD_INSET}`}>
            <h3 className="text-sm font-semibold text-center mb-4">Як працює Escrow-захист</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["1", "Спонсор платить", "Гроші заморожені"],
                ["2", "Виконавець стартує", "Підтверджує задачу"],
                ["3", "Звіт з доказами", "Фото або відео"],
                ["4", "Виплата 95%", "Після підтвердження"],
              ].map(([n, t, s]) => (
                <div key={n} className="text-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-accent mx-auto mb-2"
                    style={{ background: "rgba(233,69,96,0.15)" }}
                  >
                    {n}
                  </div>
                  <div className="text-xs font-semibold mb-1">{t}</div>
                  <div className="text-xs text-muted-foreground">{s}</div>
                </div>
              ))}
            </div>
          </InView>
          <InView className="text-left mt-6">
            <Link
              to="/transparency"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors min-h-[44px]"
            >
              Детальніше →
            </Link>
          </InView>
        </div>
      </section>

      {/* SECTION 5: CTA */}
      <section id="cta" className="py-20" style={{ background: "#16213e" }}>
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <InView>
            <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-6">
              Приєднуйся
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl text-white mb-6 leading-tight tracking-tight">
              Один крок —<br />і чиєсь життя{" "}
              <em className="not-italic" style={{ color: "#e94560" }}>
                зміниться
              </em>
            </h2>
            <p className="text-white/55 text-base mb-10 max-w-md mx-auto leading-relaxed">
              Реєстрація — 2 хвилини. Верифікація — до 24 годин. Перша допомога — одразу після входу.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-lg transition-transform duration-150 hover:-translate-y-px min-h-[44px]"
                style={{ background: "#e94560" }}
              >
                <Plus className="w-5 h-5" />
                Зареєструватись
              </Link>
              <Link
                to="/register?role=executor"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-lg transition-transform duration-150 hover:-translate-y-px min-h-[44px]"
                style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)" }}
              >
                Мені потрібна допомога
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/40">
              {["✓ 100% верифіковані", "✓ Escrow-захист", "✓ Сервери в Німеччині", "✓ GDPR"].map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
          </InView>
        </div>
      </section>
    </div>
  );
}
