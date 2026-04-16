import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Radio, Plus, ShoppingBag, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { to: "/app", icon: Home, label: "Стрічка", exact: true },
  { to: "/app/live", icon: Radio, label: "Ефіри", exact: false },
  { to: "/app/create-deal", icon: Plus, label: "", exact: false },
  { to: "/app/shop", icon: ShoppingBag, label: "Магазин", exact: false },
  { to: "/app/profile", icon: User, label: "Профіль", exact: false },
];

export default function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.to === "/app/create-deal") return false;
    if (tab.exact) return pathname === tab.to;
    return pathname.startsWith(tab.to);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-screen-sm mx-auto relative">
      <div className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-screen-sm bg-background border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {tabs.map(({ to, icon: Icon, label, exact }) => {
            const active = isActive({ to, icon: Icon, label, exact });
            return (
              <Link key={to} to={to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  active ? "text-accent" : "text-muted-foreground hover:text-foreground"
                }`}>
                {to === "/app/create-deal" ? (
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center -mt-5 shadow-lg ring-4 ring-background">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <>
                    <div className={`p-1.5 rounded-lg transition-colors ${active ? "bg-accent/10" : ""}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>{label}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
