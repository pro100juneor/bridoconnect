import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Shield, Eye, Users, Lock, CheckCircle, Plus } from "lucide-react";
import VideoHero from "@/components/VideoHero";
import { useT } from "@/i18n/useT";

// Демо-витрина получателей. Числа/флаги/фото — не переводятся, текст живёт
// в словаре (<locale>.public.json) и подтягивается по *Key.
const recipients = [
  {
    id: "r1",
    nameKey: "home.recipients.r1.name",
    name: "Оксана К.",
    flag: "🇺🇦",
    cityKey: "home.recipients.r1.city",
    city: "Харків",
    needKey: "home.recipients.r1.need",
    need: "Відновлення житла",
    bioKey: "home.recipients.r1.bio",
    bio: "Будинок пошкоджений. Дві доньки. Потрібна допомога з ремонтом.",
    goal: 3200,
    raised: 1840,
    rating: 4.9,
    deals: 17,
    photo: "/images/recipients/uk-mother.jpg",
  },
  {
    id: "r2",
    nameKey: "home.recipients.r2.name",
    name: "Аміна Х.",
    flag: "🇸🇾",
    cityKey: "home.recipients.r2.city",
    city: "Алеппо",
    needKey: "home.recipients.r2.need",
    need: "Протез ноги",
    bioKey: "home.recipients.r2.bio",
    bio: "Втратила ногу. Хоче повернутись до роботи вчителькою.",
    goal: 3200,
    raised: 2304,
    rating: 5.0,
    deals: 9,
    photo: "/images/recipients/syrian-father.jpg",
  },
  {
    id: "r3",
    nameKey: "home.recipients.r3.name",
    name: "Фатіма А.",
    flag: "🇦🇫",
    cityKey: "home.recipients.r3.city",
    city: "Кабул",
    needKey: "home.recipients.r3.need",
    need: "Освіта для дівчат",
    bioKey: "home.recipients.r3.bio",
    bio: "Організовує підпільні уроки. Потрібні підручники.",
    goal: 1400,
    raised: 1232,
    rating: 4.8,
    deals: 23,
    photo: "/images/recipients/afghan-teacher.jpg",
  },
  {
    id: "r4",
    nameKey: "home.recipients.r4.name",
    name: "Ахмед М.",
    flag: "🇸🇾",
    cityKey: "home.recipients.r4.city",
    city: "Дамаск",
    needKey: "home.recipients.r4.need",
    need: "Ліки та їжа",
    bioKey: "home.recipients.r4.bio",
    bio: "Батько трьох дітей. Потребує базової підтримки.",
    goal: 2400,
    raised: 960,
    rating: 4.7,
    deals: 5,
    photo: "/images/recipients/syrian-father.jpg",
  },
  {
    id: "r5",
    nameKey: "home.recipients.r5.name",
    name: "Надія Р.",
    flag: "🇺🇦",
    cityKey: "home.recipients.r5.city",
    city: "Миколаїв",
    needKey: "home.recipients.r5.need",
    need: "Генератор",
    bioKey: "home.recipients.r5.bio",
    bio: "Медсестра. Потрібне автономне живлення для обладнання.",
    goal: 800,
    raised: 340,
    rating: 4.9,
    deals: 4,
    photo: "/images/recipients/uk-mother.jpg",
  },
  {
    id: "r6",
    nameKey: "home.recipients.r6.name",
    name: "Карім О.",
    flag: "🇸🇩",
    cityKey: "home.recipients.r6.city",
    city: "Хартум",
    needKey: "home.recipients.r6.need",
    need: "Їжа та вода",
    bioKey: "home.recipients.r6.bio",
    bio: "Доглядає за батьками в зоні конфлікту.",
    goal: 600,
    raised: 180,
    rating: 4.6,
    deals: 3,
    photo: "/images/recipients/afghan-teacher.jpg",
  },
];

// DESIGN.md §Cards: stacked shadow + inset-highlight.
const CARD_SHADOW = "shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)]";
const CARD_INSET =
  "relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:rounded-t-2xl";

const SECTIONS = [
  { id: "hero", labelKey: "home.nav.hero", label: "Головна" },
  { id: "how", labelKey: "nav.howItWorks", label: "Як це працює" },
  { id: "recipients", labelKey: "home.nav.recipients", label: "Люди" },
  { id: "transparency", labelKey: "nav.transparency", label: "Прозорість" },
  { id: "cta", labelKey: "home.nav.cta", label: "Приєднатись" },
];

export default function HomePage() {
  const reduced = useReducedMotion();
  const { t } = useT();
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
  const rName = t(r.nameKey, r.name);

  // Hero title word-stagger (DESIGN.md §Animation) — split the translated line
  // so every language keeps the effect, not just Ukrainian.
  const heroWords = t("home.hero.titleLead", "Допомога від людини —").split(" ");
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
        aria-label={t("home.nav.aria", "Розділи")}
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
                  {t(s.labelKey, s.label)}
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
            {/* Mobile-first: VideoHero показываем выше headline на маленьких экранах,
                на lg+ — справа в отдельной колонке. */}
            <div className="lg:hidden mb-8">
              <VideoHero variant="hero" />
            </div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-xs text-white/70 font-medium"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {t("home.hero.badge", "Зараз 0 прямих ефірів · Платформа запускається")}
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-5">
              {heroWords.map((w, i) => (
                <motion.span key={`${w}-${i}`} className="inline-block mr-3" {...wordVariant(i)}>
                  {w}
                </motion.span>
              ))}
              <br />
              <motion.em
                className="not-italic"
                style={{ color: "#e94560" }}
                {...wordVariant(heroWords.length)}
              >
                {t("home.hero.titleEm", "людині")}
              </motion.em>
            </h1>
            <p className="text-base text-white/60 leading-relaxed mb-8 max-w-md">
              {t(
                "home.hero.subtitle",
                "Обери верифіковану людину і допоможи напряму. Без анонімних фондів. Без посередників. Ти бачиш результат."
              )}
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                to="/register"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-transform duration-150 hover:-translate-y-px min-h-[44px]"
                style={{ background: "#e94560" }}
              >
                {t("home.hero.ctaPrimary", "Почати допомагати →")}
              </Link>
              <Link
                to="/register?role=executor"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white/80 transition-transform duration-150 hover:-translate-y-px min-h-[44px]"
                style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)" }}
              >
                {t("home.hero.ctaSecondary", "Мені потрібна допомога")}
              </Link>
            </div>
            <div className="flex gap-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              {[
                { v: "0", l: t("home.hero.stat1.label", "ефірів зараз") },
                { v: "5%", l: t("home.hero.stat2.label", "комісія") },
                { v: t("home.hero.stat3.value", "24 год"), l: t("home.hero.stat3.label", "верифікація") },
              ].map(({ v, l }) => (
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
              {t("nav.howItWorks", "Як це працює")}
            </span>
            <h2 className="font-serif text-4xl text-foreground tracking-tight">
              {t("home.how.titleLead", "Три кроки до")}{" "}
              <em className="not-italic text-accent">{t("home.how.titleEm", "реальної допомоги")}</em>
            </h2>
          </InView>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1.5fr] gap-6">
            {[
              {
                n: "01",
                icon: Users,
                t: t("home.how.step1.title", "Знайди людину"),
                d: t(
                  "home.how.step1.desc",
                  "Переглянь профілі верифікованих отримувачів. Читай реальні історії та рейтинг. Обирай сам, без посередників."
                ),
                tag: t("home.how.step1.tag", "Лише верифіковані"),
                extended: t(
                  "home.how.step1.extended",
                  "Кожен профіль перевірений — документи, фото, історія."
                ),
              },
              {
                n: "02",
                icon: CheckCircle,
                t: t("home.how.step2.title", "Обери формат"),
                d: t(
                  "home.how.step2.desc",
                  "Переведи гроші, купи товар зі списку або постав завдання. 95% суми доходить до людини."
                ),
                tag: t("home.how.step2.tag", "95% отримувачу"),
              },
              {
                n: "03",
                icon: Eye,
                t: t("home.how.step3.title", "Отримай підтвердження"),
                d: t("home.how.step3.desc", "Фото і відео після виконання. Escrow захищає тебе."),
                tag: t("home.how.step3.tag", "Прозоро і публічно"),
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
              {t("home.how.more", "Детальніше про процес →")}
            </Link>
          </InView>
        </div>
      </section>

      {/* SECTION 3: RECIPIENTS */}
      <section id="recipients" className="py-20 bg-secondary">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <InView className="text-left mb-8 border-l-2 border-accent pl-4">
            <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-3">
              {t("home.recipients.eyebrow", "Реальні люди")}
            </span>
            <h2 className="font-serif text-4xl text-foreground tracking-tight">
              {t("home.recipients.titleLead", "Тобі можуть")}{" "}
              <em className="not-italic text-accent">{t("home.recipients.titleEm", "допомогти")}</em>
            </h2>
          </InView>
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <InView
              className={`bg-card border border-border rounded-2xl overflow-hidden ${CARD_INSET} ${CARD_SHADOW}`}
            >
              <div className="h-36 relative overflow-hidden">
                <img
                  src={r.photo}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className="absolute top-3 right-3 text-3xl drop-shadow">{r.flag}</span>
                <div className="absolute bottom-3 left-3">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium text-white backdrop-blur-md"
                    style={{ background: "rgba(29,138,90,0.85)" }}
                  >
                    ✓ {t("shop.verified", "Верифіковано")}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-foreground text-lg">
                      {rName} {r.flag}
                    </h3>
                    <p className="text-xs text-muted-foreground">{t(r.cityKey, r.city)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium">⭐ {r.rating}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("feed.dealsCount", "{n} угод", { n: r.deals })}
                    </div>
                  </div>
                </div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2 text-accent">
                  {t(r.needKey, r.need)}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t(r.bioKey, r.bio)}</p>
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold">€{r.raised.toLocaleString()}</span>
                    <span className="text-muted-foreground">
                      {t("common.of", "з")} €{r.goal.toLocaleString()}
                    </span>
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
                  {t("home.recipients.helpCta", "Допомогти {name}", { name: rName.split(" ")[0] })}
                </Link>
              </div>
            </InView>
            <div className="space-y-2">
              {recipients.map((rec, i) => (
                <button
                  key={rec.id}
                  onClick={() => setRi(i)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all min-h-[44px] hover:-translate-y-px duration-150 ${i === ri ? "border-accent bg-accent/5" : "border-border bg-card hover:border-accent/40"}`}
                >
                  <span className="text-2xl">{rec.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {t(rec.nameKey, rec.name)} · {t(rec.cityKey, rec.city)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{t(rec.needKey, rec.need)}</div>
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
                {t("home.recipients.publishCta", "Зареєструватись і опублікувати профіль →")}
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
              {t("home.transparency.eyebrow", "Безпека і прозорість")}
            </span>
            <h2 className="font-serif text-4xl text-foreground tracking-tight">
              {t("home.transparency.titleLead", "Кожен цент")}{" "}
              <em className="not-italic text-accent">{t("home.transparency.titleEm", "на виду")}</em>
            </h2>
          </InView>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-5 mb-8">
            {[
              {
                icon: Shield,
                n: "100%",
                l: t("home.transparency.pillar1.label", "Верифіковані"),
                d: t(
                  "home.transparency.pillar1.desc",
                  "Кожен отримувач проходить перевірку документів. Жодного анонімного профілю."
                ),
                anchor: true,
              },
              {
                icon: Lock,
                n: "AES-256",
                l: t("home.transparency.pillar2.label", "Шифрування"),
                d: t(
                  "home.transparency.pillar2.desc",
                  "Дані зашифровані. Сервери в Німеччині (AWS Frankfurt). Повна відповідність GDPR."
                ),
              },
              {
                icon: Eye,
                n: "98%",
                l: t("home.transparency.pillar3.label", "Доходить"),
                d: t(
                  "home.transparency.pillar3.desc",
                  "98% угод завершуються успішно. Публічна історія кожної транзакції."
                ),
              },
              {
                icon: CheckCircle,
                n: "5%",
                l: t("home.transparency.pillar4.label", "Комісія"),
                d: t(
                  "home.transparency.pillar4.desc",
                  "Лише 5% від суми. Покриває верифікацію, escrow і безпеку платежів."
                ),
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
            <h3 className="text-sm font-semibold text-center mb-4">
              {t("home.transparency.escrowTitle", "Як працює Escrow-захист")}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  n: "1",
                  t: t("home.transparency.escrow1.title", "Спонсор платить"),
                  s: t("home.transparency.escrow1.desc", "Гроші заморожені"),
                },
                {
                  n: "2",
                  t: t("home.transparency.escrow2.title", "Виконавець стартує"),
                  s: t("home.transparency.escrow2.desc", "Підтверджує задачу"),
                },
                {
                  n: "3",
                  t: t("home.transparency.escrow3.title", "Звіт з доказами"),
                  s: t("home.transparency.escrow3.desc", "Фото або відео"),
                },
                {
                  n: "4",
                  t: t("home.transparency.escrow4.title", "Виплата 95%"),
                  s: t("home.transparency.escrow4.desc", "Після підтвердження"),
                },
              ].map(({ n, t: title, s }) => (
                <div key={n} className="text-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-accent mx-auto mb-2"
                    style={{ background: "rgba(233,69,96,0.15)" }}
                  >
                    {n}
                  </div>
                  <div className="text-xs font-semibold mb-1">{title}</div>
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
              {t("home.transparency.more", "Детальніше →")}
            </Link>
          </InView>
        </div>
      </section>

      {/* SECTION 5: CTA */}
      <section id="cta" className="py-20" style={{ background: "#16213e" }}>
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <InView>
            <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-6">
              {t("home.cta.eyebrow", "Приєднуйся")}
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl text-white mb-6 leading-tight tracking-tight">
              {t("home.cta.titleLine1", "Один крок —")}
              <br />
              {t("home.cta.titleLine2", "і чиєсь життя")}{" "}
              <em className="not-italic" style={{ color: "#e94560" }}>
                {t("home.cta.titleEm", "зміниться")}
              </em>
            </h2>
            <p className="text-white/55 text-base mb-10 max-w-md mx-auto leading-relaxed">
              {t(
                "home.cta.subtitle",
                "Реєстрація — 2 хвилини. Верифікація — до 24 годин. Перша допомога — одразу після входу."
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-lg transition-transform duration-150 hover:-translate-y-px min-h-[44px]"
                style={{ background: "#e94560" }}
              >
                <Plus className="w-5 h-5" />
                {t("auth.register.submit", "Зареєструватись")}
              </Link>
              <Link
                to="/register?role=executor"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-lg transition-transform duration-150 hover:-translate-y-px min-h-[44px]"
                style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)" }}
              >
                {t("home.hero.ctaSecondary", "Мені потрібна допомога")}
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/40">
              {[
                t("home.cta.badge1", "✓ 100% верифіковані"),
                t("home.cta.badge2", "✓ Escrow-захист"),
                t("home.cta.badge3", "✓ Сервери в Німеччині"),
                t("home.cta.badge4", "✓ GDPR"),
              ].map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
          </InView>
        </div>
      </section>
    </div>
  );
}
