import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ImpressumPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background px-6 py-10 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground mb-8 text-sm">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>
      <h1 className="font-serif text-3xl text-foreground mb-8">Impressum</h1>

      <div className="space-y-6 text-sm text-foreground">
        <section>
          <h2 className="font-semibold text-base mb-2">Angaben gemäß § 5 TMG</h2>
          <p>
            Firma „Luftarbeiter"<br />
            Inh. Oleksii Kusov<br />
            Mosenstraße 3<br />
            08209 Auerbach<br />
            Deutschland
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Steuernummer &amp; USt-IdNr.</h2>
          <p>
            Steuernummer: 223/242/09623<br />
            USt-IdNr.: DE359345814
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Kontakt</h2>
          <p>
            E-Mail: <a href="mailto:info@brido.de" className="text-accent underline">info@brido.de</a><br />
            Web: <a href="https://brido.de" className="text-accent underline">brido.de</a>
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Bankverbindung</h2>
          <p>
            IBAN: DE55 8704 0000 0434 8629 00<br />
            Commerzbank AG<br />
            Postfach 1464<br />
            39004 Magdeburg<br />
            USt-IdNr.: DE 114 103 514
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV)</h2>
          <p>
            Oleksii Kusov<br />
            Mosenstraße 3<br />
            08209 Auerbach
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Streitschlichtung</h2>
          <p className="text-muted-foreground">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a href="https://ec.europa.eu/consumers/odr/" className="text-accent underline" target="_blank" rel="noreferrer">
              ec.europa.eu/consumers/odr
            </a>.<br />
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>
      </div>
    </div>
  );
};
export default ImpressumPage;
