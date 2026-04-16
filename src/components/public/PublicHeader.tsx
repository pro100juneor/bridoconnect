import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Logo from "../Logo";
import { Menu, X, LogIn, UserPlus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/how-it-works", label: "Як це працює" },
  { to: "/transparency", label: "Прозорість" },
  { to: "/live", label: "Ефіри" },
  { to: "/shop", label: "Магазин" },
  { to: "/about", label: "Про нас" },
  { to: "/faq", label: "FAQ" },
];

const PublicHeader = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-4 py-3 max-w-screen-sm mx-auto">
        <Logo />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => navigate("/auth")} className="hidden sm:flex gap-1 text-muted-foreground">
            <LogIn className="w-4 h-4" /> Вхід
          </Button>
          <Button size="sm" className="hidden sm:flex bg-accent hover:bg-accent/90 text-white gap-1" onClick={() => navigate("/register")}>
            <UserPlus className="w-4 h-4" /> Реєстрація
          </Button>
          <button onClick={() => setOpen(!open)} className="p-2 text-foreground">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-4 max-w-screen-sm mx-auto">
          <nav className="space-y-1 mb-4">
            {nav.map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === to ? "bg-accent/10 text-accent" : "text-foreground hover:bg-secondary"
                }`}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => { navigate("/auth"); setOpen(false); }}>
              <LogIn className="w-4 h-4 mr-2" /> Увійти
            </Button>
            <Button className="flex-1 bg-accent hover:bg-accent/90 text-white" onClick={() => { navigate("/register"); setOpen(false); }}>
              <UserPlus className="w-4 h-4 mr-2" /> Реєстрація
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
export default PublicHeader;
