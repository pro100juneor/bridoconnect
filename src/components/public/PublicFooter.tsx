import { Link } from "react-router-dom";
import Logo from "../Logo";

const sections = [
  {
    title: "Платформа",
    links: [
      { to: "/how-it-works", label: "Як це працює" },
      { to: "/transparency", label: "Прозорість" },
      { to: "/live", label: "Ефіри" },
      { to: "/shop", label: "Магазин" },
      { to: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Компанія",
    links: [
      { to: "/about", label: "Про нас" },
      { to: "/verification", label: "Верифікація" },
    ],
  },
  {
    title: "Правове",
    links: [
      { to: "/faq", label: "Impressum" },
      { to: "/faq", label: "Datenschutz" },
      { to: "/faq", label: "AGB" },
    ],
  },
];

const PublicFooter = () => (
  <footer className="bg-primary text-white mt-auto">
    <div className="px-6 py-10 max-w-screen-sm mx-auto">
      <div className="mb-8">
        <Logo light />
        <p className="text-white/60 text-sm mt-2">P2P платформа прямої гуманітарної допомоги.</p>
      </div>
      <div className="grid grid-cols-3 gap-6 mb-8">
        {sections.map(section => (
          <div key={section.title}>
            <p className="font-semibold text-sm mb-3">{section.title}</p>
            <ul className="space-y-2">
              {section.links.map(link => (
                <li key={link.label}>
                  <Link to={link.to} className="text-white/60 text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-white/40 text-xs">© 2026 BridoConnect GmbH · Deutschland</p>
        <div className="flex gap-4">
          <Link to="/auth" className="text-white/60 text-xs hover:text-white">Увійти</Link>
          <Link to="/register" className="text-white text-xs font-semibold">Реєстрація →</Link>
        </div>
      </div>
    </div>
  </footer>
);
export default PublicFooter;
