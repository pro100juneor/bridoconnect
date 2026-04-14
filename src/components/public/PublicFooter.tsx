import { Link } from "react-router-dom";
import Logo from "../Logo";
const PublicFooter = () => (
  <footer className="bg-foreground text-background/60 py-12 px-6">
    <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
      <div><Logo light /><p className="text-sm mt-3">P2P платформа прямої гуманітарної допомоги.</p></div>
      <div><h4 className="text-background font-semibold text-sm mb-3">Платформа</h4><div className="space-y-2 text-sm">{[["/how-it-works","Як це працює"],["/transparency","Прозорість"],["/live","Ефіри"],["/faq","FAQ"]].map(([h,l])=><Link key={h} to={h} className="block hover:text-background">{l}</Link>)}</div></div>
      <div><h4 className="text-background font-semibold text-sm mb-3">Компанія</h4><div className="space-y-2 text-sm">{[["/about","Про нас"],["/contacts","Контакти"],["/careers","Кар'єра"]].map(([h,l])=><Link key={h} to={h} className="block hover:text-background">{l}</Link>)}</div></div>
      <div><h4 className="text-background font-semibold text-sm mb-3">Правове</h4><div className="space-y-2 text-sm">{[["/impressum","Impressum"],["/datenschutz","Datenschutz"],["/agb","AGB"]].map(([h,l])=><Link key={h} to={h} className="block hover:text-background">{l}</Link>)}</div></div>
    </div>
    <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/10 text-xs text-center">© 2026 BridoConnect GmbH · Deutschland</div>
  </footer>
);
export default PublicFooter;
