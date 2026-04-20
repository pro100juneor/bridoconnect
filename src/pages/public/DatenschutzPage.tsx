import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "1. Datenschutz auf einen Blick",
    content: "Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können."
  },
  {
    title: "2. Datenerfassung auf dieser Website",
    content: "Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Firma „Luftarbeiter“, Inh. Oleksii Kusov, Mosenstraße 3, 08209 Auerbach. Sie erreichen uns unter info@brido.de."
  },
  {
    title: "3. Wie erfassen wir Ihre Daten?",
    content: "Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen (z.B. durch Registrierung). Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst."
  },
  {
    title: "4. Wofür nutzen wir Ihre Daten?",
    content: "Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden."
  },
  {
    title: "5. Supabase & Hosting",
    content: "Diese Website nutzt Supabase für Datenbankdienste sowie Vercel für das Hosting. Beide Anbieter sind DSGVO-konform. Details finden Sie in den Datenschutzerklärungen von Supabase (supabase.com) und Vercel (vercel.com)."
  },
  {
    title: "6. Stripe Zahlungen",
    content: "Für die Zahlungsabwicklung nutzen wir Stripe. Stripe ist PCI-DSS-zertifiziert. Ihre Zahlungsdaten werden direkt an Stripe übermittelt und von BridoConnect nicht gespeichert."
  },
  {
    title: "7. Ihre Rechte",
    content: "Sie haben jederzeit das Recht auf Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger sowie den Zweck der Datenverarbeitung. Sie haben außerdem ein Recht auf Berichtigung oder Löschung dieser Daten. Kontakt: info@brido.de"
  },
];

const DatenschutzPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background px-6 py-10 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground mb-8 text-sm">
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>
      <h1 className="font-serif text-3xl text-foreground mb-2">Datenschutzerklärung</h1>
      <p className="text-muted-foreground text-sm mb-8">Політика конфіденційності / Privacy Policy</p>
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
export default DatenschutzPage;
