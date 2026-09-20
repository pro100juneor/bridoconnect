import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Globe, HelpCircle, Clock } from "lucide-react";
import { useT } from "@/i18n/useT";

const SupportPage = () => {
  const navigate = useNavigate();
  const { t } = useT();
  return (
    <main className="min-h-screen bg-background px-6 py-10 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        aria-label={t("common.back", "Назад")}
        className="flex items-center gap-2 text-muted-foreground mb-8 text-sm min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> {t("common.back", "Назад")}
      </button>
      <h1 className="font-serif text-4xl tracking-tight text-foreground mb-8 animate-fade-in">
        {t("support.title", "Підтримка")}
      </h1>

      <div className="space-y-6 text-sm text-foreground leading-relaxed">
        <section>
          <p className="text-muted-foreground">
            {t(
              "support.intro",
              "Ми допоможемо з будь-яким питанням щодо акаунту, платежів, ефірів, магазину чи верифікації. Оберіть зручний спосіб зв’язку — ми відповідаємо якнайшвидше."
            )}
          </p>
        </section>

        <section className="flex items-start gap-3">
          <Mail className="w-5 h-5 mt-0.5 text-accent" strokeWidth={1.75} />
          <div>
            <h2 className="font-semibold text-base mb-1">{t("support.email.title", "E-mail підтримки")}</h2>
            <p>
              <a href="mailto:pro100juneor@gmail.com" className="text-accent underline">
                pro100juneor@gmail.com
              </a>
              <br />
              {t("support.email.general", "Загальні питання:")}{" "}
              <a href="mailto:pro100juneor@gmail.com" className="text-accent underline">
                pro100juneor@gmail.com
              </a>
            </p>
          </div>
        </section>

        <section className="flex items-start gap-3">
          <Clock className="w-5 h-5 mt-0.5 text-accent" strokeWidth={1.75} />
          <div>
            <h2 className="font-semibold text-base mb-1">{t("support.hours.title", "Час відповіді")}</h2>
            <p className="text-muted-foreground">
              {t(
                "support.hours.body",
                "Пн–Пт, зазвичай протягом 24 годин. Термінові питання щодо платежів позначайте темою «URGENT»."
              )}
            </p>
          </div>
        </section>

        <section className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 mt-0.5 text-accent" strokeWidth={1.75} />
          <div>
            <h2 className="font-semibold text-base mb-1">{t("faq.title", "Часті питання")}</h2>
            <p>
              {t("support.faq.body", "Багато відповідей уже зібрано в")}{" "}
              <button onClick={() => navigate("/faq")} className="text-accent underline">
                {t("support.faq.link", "розділі FAQ")}
              </button>
              .
            </p>
          </div>
        </section>

        <section className="flex items-start gap-3">
          <Globe className="w-5 h-5 mt-0.5 text-accent" strokeWidth={1.75} />
          <div>
            <h2 className="font-semibold text-base mb-1">{t("support.operator.title", "Оператор")}</h2>
            <p className="text-muted-foreground">
              {/* Юридическое наименование и адрес — не переводим */}
              Firma „Luftarbeiter“, Inh. Oleksii Kusov, Mosenstraße 3, 08209 Auerbach, Deutschland.{" "}
              {t("support.operator.details", "Повні реквізити —")}{" "}
              <button onClick={() => navigate("/impressum")} className="text-accent underline">
                {t("support.operator.link", "в Impressum")}
              </button>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};
export default SupportPage;
