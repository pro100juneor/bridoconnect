import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { tap } from "@/lib/native";
import {
  ChevronRight,
  Bell,
  Shield,
  Globe,
  Moon,
  LogOut,
  HelpCircle,
  FileText,
  Smartphone,
  Mail,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/hooks/usePreferences";
import { toast } from "@/hooks/use-toast";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { prefs, update, tableAvailable } = usePreferences();

  // Застосовуємо dark-mode клас на <html>
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.dark_mode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [prefs.dark_mode]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleToggle = async (key: keyof typeof prefs, value: boolean) => {
    const { error } = await update({ [key]: value });
    if (error) {
      toast({
        title: "Помилка",
        description: error.message || "Не вдалося зберегти",
        variant: "destructive",
      });
    }
  };

  const sections: Array<{
    title: string;
    items: Array<{
      icon?: any;
      label: string;
      value?: string;
      toggle?: boolean;
      toggleValue?: boolean;
      onChange?: (v: boolean) => void;
      arrow?: boolean;
      path?: string;
    }>;
  }> = [
    {
      title: "Акаунт",
      items: [{ icon: Mail, label: "Email", value: user?.email || "—" }],
    },
    {
      title: "Сповіщення",
      items: [
        {
          icon: Bell,
          label: "Push-сповіщення",
          toggle: true,
          toggleValue: prefs.push_notifications,
          onChange: (v) => handleToggle("push_notifications", v),
        },
        {
          icon: Mail,
          label: "Email-сповіщення",
          toggle: true,
          toggleValue: prefs.email_notifications,
          onChange: (v) => handleToggle("email_notifications", v),
        },
      ],
    },
    {
      title: "Безпека",
      items: [
        {
          icon: Shield,
          label: "Двофакторна автентифікація",
          toggle: true,
          toggleValue: prefs.two_factor,
          onChange: (v) => handleToggle("two_factor", v),
        },
        {
          icon: Shield,
          label: "Верифікація акаунту",
          arrow: true,
          path: "/verification",
        },
      ],
    },
    {
      title: "Вигляд",
      items: [
        {
          icon: Moon,
          label: "Темна тема",
          toggle: true,
          toggleValue: prefs.dark_mode,
          onChange: (v) => handleToggle("dark_mode", v),
        },
        { icon: Globe, label: "Мова", value: "Українська" },
      ],
    },
    {
      title: "Підтримка",
      items: [
        { icon: HelpCircle, label: "Довідка", arrow: true, path: "/faq" },
        { icon: FileText, label: "Умови використання", arrow: true, path: "/agb" },
        { icon: Smartphone, label: "Версія", value: "1.0.0" },
      ],
    },
  ];

  return (
    <div className="pb-8">
      <h1 className="sr-only">Налаштування</h1>
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-2">
        <h2 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">Налаштування</h2>
        {!tableAvailable && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Налаштування зберігаються локально (БД offline)
          </p>
        )}
      </div>
      <div className="px-4 space-y-5 mt-4">
        <div className="bg-secondary rounded-2xl p-4">
          <LocaleSwitcher />
        </div>
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {section.title}
            </p>
            <div className="bg-secondary rounded-2xl overflow-hidden divide-y divide-border">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  onClick={() => {
                    if (item.path) {
                      void tap("light");
                      navigate(item.path);
                    }
                  }}
                  className={`flex items-center gap-3 px-4 py-3 min-h-[44px] ${item.path ? "cursor-pointer hover:bg-secondary/50 transition-colors" : ""}`}
                >
                  {item.icon && <item.icon className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />}
                  <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                  {item.toggle ? (
                    <Switch
                      checked={!!item.toggleValue}
                      onCheckedChange={(v) => {
                        void tap("light");
                        item.onChange?.(v);
                      }}
                    />
                  ) : item.arrow ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                  ) : (
                    <span className="text-xs text-muted-foreground">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={() => {
            void tap("medium");
            handleSignOut();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] bg-destructive/10 rounded-2xl text-destructive transition-transform duration-150 hover:-translate-y-px"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-sm font-medium">Вийти з акаунту</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;
