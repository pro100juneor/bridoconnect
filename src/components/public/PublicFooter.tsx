import { Link } from "react-router-dom";
import Logo from "../Logo";
import { useT } from "@/i18n/useT";

const sections = [
  {
    titleKey: "footer.section.platform",
    title: "Платформа",
    links: [
      { to: "/how-it-works", labelKey: "nav.howItWorks", label: "Як це працює" },
      { to: "/transparency", labelKey: "nav.transparency", label: "Прозорість" },
      { to: "/live", labelKey: "nav.live", label: "Ефіри" },
      { to: "/shop", labelKey: "nav.shop", label: "Магазин" },
      // FAQ is the same acronym in uk/en/de — nothing to translate.
      { to: "/faq", labelKey: "", label: "FAQ" },
    ],
  },
  {
    titleKey: "footer.section.company",
    title: "Компанія",
    links: [
      { to: "/about", labelKey: "nav.about", label: "Про нас" },
      { to: "/verification", labelKey: "nav.verification", label: "Верифікація" },
      { to: "/support", labelKey: "nav.support", label: "Підтримка" },
    ],
  },
  {
    titleKey: "footer.section.legal",
    title: "Правове",
    links: [
      { to: "/impressum", labelKey: "footer.legal.impressum", label: "Impressum" },
      { to: "/datenschutz", labelKey: "footer.legal.datenschutz", label: "Datenschutz" },
      { to: "/agb", labelKey: "footer.legal.agb", label: "AGB" },
    ],
  },
];

const PublicFooter = () => {
  const { t } = useT();
  return (
    <footer className="bg-primary text-white mt-auto">
      <div className="px-6 py-10 max-w-screen-sm mx-auto">
        <div className="mb-8">
          <Logo light />
          <p className="text-white/60 text-sm mt-2">
            {t("footer.tagline", "P2P платформа прямої гуманітарної допомоги.")}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6 mb-8">
          {sections.map((section) => (
            <div key={section.titleKey}>
              <p className="font-semibold text-sm mb-3">{t(section.titleKey, section.title)}</p>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-white/60 text-sm hover:text-white transition-colors">
                      {link.labelKey ? t(link.labelKey, link.label) : link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Legal entity line — brand + Handelsregister name, never translated. */}
          <p className="text-white/40 text-xs">© 2026 BridoConnect GmbH · Deutschland</p>
          <div className="flex gap-4">
            <Link to="/auth" className="text-white/60 text-xs hover:text-white">
              {t("auth.login.submit", "Увійти")}
            </Link>
            <Link to="/register" className="text-white text-xs font-semibold">
              {t("footer.registerCta", "Реєстрація →")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default PublicFooter;
