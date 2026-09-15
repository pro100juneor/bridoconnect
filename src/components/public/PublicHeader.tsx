import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Logo from "../Logo";
import { Menu, X, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";

const nav = [
  { to: "/how-it-works", labelKey: "nav.howItWorks", label: "Як це працює" },
  { to: "/transparency", labelKey: "nav.transparency", label: "Прозорість" },
  { to: "/live", labelKey: "nav.live", label: "Ефіри" },
  { to: "/shop", labelKey: "nav.shop", label: "Магазин" },
  { to: "/verification", labelKey: "nav.verification", label: "Верифікація" },
  { to: "/about", labelKey: "nav.about", label: "Про нас" },
  // FAQ is the same acronym in uk/en/de — nothing to translate.
  { to: "/faq", labelKey: "", label: "FAQ" },
];

const PublicHeader = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useT();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-4 py-3 max-w-screen-sm mx-auto">
        <Logo />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(!open)}
            className="p-2 text-foreground"
            aria-expanded={open}
            aria-label={open ? t("nav.menuClose", "Закрити меню") : t("nav.menuOpen", "Відкрити меню")}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-4 max-w-screen-sm mx-auto">
          <nav className="space-y-1 mb-4">
            {nav.map(({ to, labelKey, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === to ? "bg-accent/10 text-accent" : "text-foreground hover:bg-secondary"
                }`}
              >
                {labelKey ? t(labelKey, label) : label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                navigate("/auth");
                setOpen(false);
              }}
            >
              <LogIn className="w-4 h-4 mr-2" /> {t("auth.login.submit", "Увійти")}
            </Button>
            <Button
              className="flex-1 bg-accent hover:bg-accent/90 text-white"
              onClick={() => {
                navigate("/register");
                setOpen(false);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" /> {t("auth.register.title", "Реєстрація")}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
export default PublicHeader;
