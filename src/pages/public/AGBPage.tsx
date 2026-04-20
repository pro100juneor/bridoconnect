import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "§ 1 Geltungsbereich",
    content: "Diese Allgemeinen Geschäftsbedingungen gelten für alle Nutzer der Plattform BridoConnect, betrieben von Firma „Luftarbeiter“, Inh. Oleksii Kusov, Mosenstraße 3, 08209 Auerbach."
  },
  {
    title: "§ 2 Leistungsbeschreibung",
    content: "BridoConnect ist eine P2P-Plattform für humanitäre Hilfe. Die Plattform vermittelt zwischen Hilfesuchenden und Spendern. BridoConnect ist kein Treuhänder und keine Wohltätigkeitsorganisation."
  },
  {
    title: "§ 3 Registrierung",
    content: "Für die Nutzung der Plattform ist eine Registrierung erforderlich. Der Nutzer muss volljährig sein. Die Angaben bei der Registrierung müssen wahrheitsgemäß sein."
  },
  {
    title: "§ 4 Verifizierung",
    content: "BridoConnect bietet ein freiwilliges Verifizierungsverfahren an. Verifizierte Nutzer erhalten einen entsprechenden Badge. Die Verifizierung erhöht das Vertrauen auf der Plattform."
  },
  {
    title: "§ 5 Zahlungen und Gebühren",
    content: "Zahlungen werden über Stripe abgewickelt. BridoConnect erhebt eine Servicegebühr von 5% auf alle Transaktionen. Premium-Nutzer sind von der Servicegebühr befreit."
  },
  {
    title: "§ 6 Haftung",
    content: "BridoConnect haftet nicht für die Richtigkeit der von Nutzern eingestellten Informationen. Nutzer sind selbst verantwortlich für ihre Angaben. BridoConnect übernimmt keine Haftung für Transaktionen zwischen Nutzern."
  },
  {
    title: "§ 7 Kündigung",
    content: "Nutzer können ihr Konto jederzeit löschen. BridoConnect kann Konten bei Verstößen gegen diese AGB ohne Vorankündigung sperren oder löschen."
  },
  {
    title: "§ 8 Anwendbares Recht",
    content: "Es gilt deutsches Recht. Gerichtsstand ist Auerbach/Vogtland, sofern der Nutzer Kaufmann ist."
  },
];

const AGBPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background px-6 py-10 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground mb-8 text-sm">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>
      <h1 className="font-serif text-3xl text-foreground mb-2">AGB</h1>
      <p className="text-muted-foreground text-sm mb-8">Allgemeine Geschäftsbedingungen · Загальні умови</p>
      <div className="space-y-6">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="font-semibold text-base text-foreground mb-2">{s.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.content}</p>
          </section>
        ))}
      </div>
    </div>
  );
};
export default AGBPage;
