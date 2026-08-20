import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Globe, HelpCircle, Clock } from "lucide-react";

const SupportPage = () => {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-background px-6 py-10 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        aria-label="Назад"
        className="flex items-center gap-2 text-muted-foreground mb-8 text-sm min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Назад
      </button>
      <h1 className="font-serif text-4xl tracking-tight text-foreground mb-8 animate-fade-in">Підтримка</h1>

      <div className="space-y-6 text-sm text-foreground leading-relaxed">
        <section>
          <p className="text-muted-foreground">
            Ми допоможемо з будь-яким питанням щодо акаунту, платежів, ефірів, магазину чи верифікації.
            Оберіть зручний спосіб зв’язку — ми відповідаємо якнайшвидше.
          </p>
        </section>

        <section className="flex items-start gap-3">
          <Mail className="w-5 h-5 mt-0.5 text-accent" strokeWidth={1.75} />
          <div>
            <h2 className="font-semibold text-base mb-1">E-mail підтримки</h2>
            <p>
              <a href="mailto:support@brido.de" className="text-accent underline">
                support@brido.de
              </a>
              <br />
              Загальні питання:{" "}
              <a href="mailto:info@brido.de" className="text-accent underline">
                info@brido.de
              </a>
            </p>
          </div>
        </section>

        <section className="flex items-start gap-3">
          <Clock className="w-5 h-5 mt-0.5 text-accent" strokeWidth={1.75} />
          <div>
            <h2 className="font-semibold text-base mb-1">Час відповіді</h2>
            <p className="text-muted-foreground">
              Пн–Пт, зазвичай протягом 24 годин. Термінові питання щодо платежів позначайте темою «URGENT».
            </p>
          </div>
        </section>

        <section className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 mt-0.5 text-accent" strokeWidth={1.75} />
          <div>
            <h2 className="font-semibold text-base mb-1">Часті питання</h2>
            <p>
              Багато відповідей уже зібрано в{" "}
              <button onClick={() => navigate("/faq")} className="text-accent underline">
                розділі FAQ
              </button>
              .
            </p>
          </div>
        </section>

        <section className="flex items-start gap-3">
          <Globe className="w-5 h-5 mt-0.5 text-accent" strokeWidth={1.75} />
          <div>
            <h2 className="font-semibold text-base mb-1">Оператор</h2>
            <p className="text-muted-foreground">
              Firma „Luftarbeiter“, Inh. Oleksii Kusov, Mosenstraße 3, 08209 Auerbach, Deutschland. Повні
              реквізити —{" "}
              <button onClick={() => navigate("/impressum")} className="text-accent underline">
                в Impressum
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
