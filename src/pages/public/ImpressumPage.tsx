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
          <p>BridoConnect GmbH<br />
          Musterstraße 1<br />
          60311 Frankfurt am Main<br />
          Deutschland</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Kontakt</h2>
          <p>E-Mail: <a href="mailto:info@brido.de" className="text-accent underline">info@brido.de</a></p>
          <p>Web: <a href="https://brido.de" className="text-accent underline">brido.de</a></p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Handelsregister</h2>
          <p>Registergericht: Amtsgericht Frankfurt am Main<br />
          Registernummer: HRB 000000</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Geschäftsführung</h2>
          <p>Oleksii — Geschäftsführer</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Umsatzsteuer-ID</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
          DE 000000000</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Verantwortlich für den Inhalt</h2>
          <p>BridoConnect GmbH<br />
          Musterstraße 1, 60311 Frankfurt am Main</p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Streitschlichtung</h2>
          <p className="text-muted-foreground">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
            <a href="https://ec.europa.eu/consumers/odr/" className="text-accent underline ml-1" target="_blank" rel="noreferrer">
              ec.europa.eu/consumers/odr
            </a>
          </p>
        </section>
      </div>
    </div>
  );
};
export default ImpressumPage;
