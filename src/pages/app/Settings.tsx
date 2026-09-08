import { useEffect, useState } from "react";
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
  Lock,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/hooks/usePreferences";
import { toast } from "@/hooks/use-toast";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";

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

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast({
          title: "Не вдалося видалити акаунт",
          description: body.message || body.error || "Спробуйте пізніше",
          variant: "destructive",
        });
        return;
      }
      await signOut();
      toast({ title: "Акаунт видалено", description: "Дякуємо, що були з нами." });
      navigate("/auth");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
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
        {
          icon: Lock,
          label: "Приватність спонсора",
          arrow: true,
          path: "/app/sponsor-privacy",
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
        <div className="bg-secondary rounded-2xl p-4">
          <CurrencySwitcher />
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

        <button
          data-testid="delete-account"
          onClick={() => {
            void tap("medium");
            setDeleteOpen(true);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] border border-destructive/40 rounded-2xl text-destructive transition-transform duration-150 hover:-translate-y-px"
        >
          <Trash2 className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-sm font-medium">Видалити акаунт назавжди</span>
        </button>
        <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
          Профіль, товари та особисті дані буде видалено безповоротно. Фінансові записи знеособлюються згідно
          з вимогами обліку.
        </p>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(v) => !deleting && setDeleteOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Видалити акаунт?</DialogTitle>
            <DialogDescription>
              Дія незворотна: профіль, оголошення і всі особисті дані буде стерто. Якщо у вас є активні угоди,
              спершу завершіть їх.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteOpen(false)}>
              Скасувати
            </Button>
            <Button
              data-testid="confirm-delete-account"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDeleteAccount()}
            >
              {deleting ? "Видаляємо…" : "Так, видалити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
