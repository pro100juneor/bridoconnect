import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Radio, Plus, ShoppingBag, User, Heart, MessageCircle, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useT } from "@/i18n/useT";
import type { UserRole } from "@/integrations/supabase/types";

// labelKey замість готового рядка — підпис береться зі словника на кожному рендері,
// тому нижня навігація перемальовується разом зі зміною мови.
interface Tab {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  fallback: string;
  exact?: boolean;
  center?: boolean; // крупная центральная «+» (создание запроса получателем)
}

// Навигация зависит от роли: спонсор помогает/дарит, получатель создаёт запросы и
// получает, мерчант ведёт магазин. Используются существующие роуты (экраны заказов/
// подарков появятся в следующих фазах и встанут в соответствующие наборы).
const SPONSOR_TABS: Tab[] = [
  { to: "/app", icon: Home, labelKey: "nav.feed", fallback: "Стрічка", exact: true },
  { to: "/app/shop", icon: ShoppingBag, labelKey: "nav.shop", fallback: "Магазин" },
  { to: "/app/live", icon: Radio, labelKey: "nav.live", fallback: "Ефіри" },
  { to: "/app/deals", icon: Heart, labelKey: "nav.deals", fallback: "Угоди" },
  { to: "/app/profile", icon: User, labelKey: "nav.profile", fallback: "Профіль" },
];

const RECIPIENT_TABS: Tab[] = [
  { to: "/app", icon: Home, labelKey: "nav.feed", fallback: "Стрічка", exact: true },
  { to: "/app/live", icon: Radio, labelKey: "nav.live", fallback: "Ефіри" },
  { to: "/app/create-deal", icon: Plus, labelKey: "nav.create", fallback: "", center: true },
  { to: "/app/shop", icon: ShoppingBag, labelKey: "nav.shop", fallback: "Магазин" },
  { to: "/app/profile", icon: User, labelKey: "nav.profile", fallback: "Профіль" },
];

const MERCHANT_TABS: Tab[] = [
  { to: "/app/shop", icon: ShoppingBag, labelKey: "nav.shop", fallback: "Магазин", exact: true },
  { to: "/app/live", icon: Radio, labelKey: "nav.live", fallback: "Ефіри" },
  { to: "/app/chats", icon: MessageCircle, labelKey: "nav.chats", fallback: "Чати" },
  { to: "/app/profile", icon: User, labelKey: "nav.profile", fallback: "Профіль" },
];

function tabsForRole(role: UserRole | undefined): Tab[] {
  if (role === "recipient") return RECIPIENT_TABS;
  if (role === "merchant") return MERCHANT_TABS;
  return SPONSOR_TABS; // sponsor (и запасной вариант для admin/неизвестного)
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { t } = useT();

  if (!user) return null;

  const tabs = tabsForRole(profile?.role);

  const isActive = (tab: Tab) => {
    if (tab.center) return false;
    if (tab.exact) return pathname === tab.to;
    return pathname.startsWith(tab.to);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-screen-sm mx-auto relative">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-accent focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        {t("nav.skipToContent", "Перейти до основного вмісту")}
      </a>
      <main
        id="app-main"
        className="flex-1 pb-20 overflow-y-auto pt-[env(safe-area-inset-top)]"
        tabIndex={-1}
      >
        <Outlet />
      </main>
      <nav
        aria-label={t("nav.main", "Головна навігація")}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-screen-sm bg-background border-t border-border z-50 safe-area-bottom"
      >
        <div className="flex items-center justify-around px-2 py-1.5">
          {tabs.map((tab) => {
            const { to, icon: Icon, labelKey, fallback, center } = tab;
            const active = isActive(tab);
            const label = center ? "" : t(labelKey, fallback);
            return (
              <Link
                key={to}
                to={to}
                aria-label={t(labelKey, fallback)}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                  active ? "text-accent" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {center ? (
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center -mt-5 shadow-lg ring-4 ring-background">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <>
                    <div className={`p-1.5 rounded-lg transition-colors ${active ? "bg-accent/10" : ""}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>
                      {label}
                    </span>
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
