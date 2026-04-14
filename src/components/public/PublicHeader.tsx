import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../Logo";
import { Menu, X } from "lucide-react";
const nav = [{to:"/how-it-works",label:"Як це працює"},{to:"/transparency",label:"Прозорість"},{to:"/live",label:"Ефіри"},{to:"/about",label:"Про нас"},{to:"/faq",label:"FAQ"}];
const PublicHeader = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden lg:flex items-center gap-6">
          {nav.map(n => <Link key={n.to} to={n.to} className={`text-sm font-medium transition-colors ${pathname===n.to?"text-accent":"text-muted-foreground hover:text-foreground"}`}>{n.label}</Link>)}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">Увійти</Link>
          <Link to="/register" className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors">Почати</Link>
        </div>
        <button className="lg:hidden p-2" onClick={() => setOpen(!open)}>{open ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}</button>
      </div>
      {open && <div className="lg:hidden border-t border-border bg-background px-6 py-4 space-y-3">
        {nav.map(n => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block text-sm font-medium py-2">{n.label}</Link>)}
        <div className="flex gap-3 pt-2">
          <Link to="/auth" onClick={() => setOpen(false)} className="flex-1 text-center py-2 text-sm border border-border rounded-lg">Увійти</Link>
          <Link to="/register" onClick={() => setOpen(false)} className="flex-1 text-center py-2 text-sm bg-accent text-white rounded-lg font-semibold">Почати</Link>
        </div>
      </div>}
    </header>
  );
};
export default PublicHeader;
