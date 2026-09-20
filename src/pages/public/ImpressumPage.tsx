import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/i18n/useT";

// Імпресум за § 5 TMG — обов'язкові відомості німецькою. Не перекладається.
const ImpressumPage = () => {
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
      <h1 className="font-serif text-4xl tracking-tight text-foreground mb-8 animate-fade-in">Impressum</h1>

      <div className="space-y-6 text-sm text-foreground leading-relaxed">
        <section>
          <h2 className="font-semibold text-base mb-2">Angaben gemäß § 5 TMG</h2>
          <p>
            Firma „Luftarbeiter"
            <br />
            Inh. Oleksii Kusov
            <br />
            Mosenstraße 3<br />
            08209 Auerbach
            <br />
            Deutschland
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Steuernummer &amp; USt-IdNr.</h2>
          <p>
            Steuernummer: 223/242/09623
            <br />
            USt-IdNr.: DE359345814
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Kontakt</h2>
          <p>
            E-Mail:{" "}
            <a href="mailto:pro100juneor@gmail.com" className="text-accent underline">
              pro100juneor@gmail.com
            </a>
            <br />
            Web:{" "}
            <a href="https://bridoconnect.vercel.app" className="text-accent underline">
              bridoconnect.vercel.app
            </a>
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Bankverbindung</h2>
          <p>
            IBAN: DE55 8704 0000 0434 8629 00
            <br />
            Commerzbank AG
            <br />
            Postfach 1464
            <br />
            39004 Magdeburg
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV)</h2>
          <p>
            Oleksii Kusov
            <br />
            Mosenstraße 3<br />
            08209 Auerbach
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Streitschlichtung</h2>
          <p className="text-muted-foreground">
            {/* Die EU-Plattform zur Online-Streitbeilegung (OS) wurde am 20.07.2025
                eingestellt; der frühere Verweis wurde daher entfernt. */}
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).
          </p>
        </section>
      </div>
    </main>
  );
};
export default ImpressumPage;
