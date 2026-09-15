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
  type LucideIcon,
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
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/hooks/usePreferences";
import { toast } from "@/hooks/use-toast";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { TwoFactorDialog } from "@/components/TwoFactorDialog";
import { useMfa } from "@/hooks/useMfa";
import { useT } from "@/i18n/useT";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { prefs, update, tableAvailable } = usePreferences();
  const { t } = useT();
  const mfa = useMfa();
  const [mfaDialog, setMfaDialog] = useState<"enroll" | "disable" | null>(null);

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
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
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
          title: t("settings.deleteAccount.errorTitle", "Не вдалося видалити акаунт"),
          // body.message / body.error приходят с бэкенда — не переводим
          description: body.message || body.error || t("common.retryLater", "Спробуйте пізніше"),
          variant: "destructive",
        });
        return;
      }
      await signOut();
      toast({
        title: t("settings.deleteAccount.successTitle", "Акаунт видалено"),
        description: t("settings.deleteAccount.successDesc", "Дякуємо, що були з нами."),
      });
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
        title: t("settings.error.title", "Помилка"),
        // error.message приходит с бэкенда — не переводим
        description: error.message || t("settings.saveFailed", "Не вдалося зберегти"),
        variant: "destructive",
      });
    }
  };

  const sections: Array<{
    title: string;
    items: Array<{
      icon?: LucideIcon;
      label: string;
      value?: string;
      toggle?: boolean;
      toggleValue?: boolean;
      toggleDisabled?: boolean;
      onChange?: (v: boolean) => void;
      arrow?: boolean;
      path?: string;
      hint?: string;
    }>;
  }> = [
    {
      title: t("settings.section.account", "Акаунт"),
      items: [{ icon: Mail, label: t("settings.emailLabel", "Email"), value: user?.email || "—" }],
    },
    {
      // Тумблер push-сповіщень прибрано: доставки немає (ні APNs, ні web-push),
      // а перемикач створював враження працюючої функції. Повертати — разом
      // з реальною доставкою через Capacitor/APNs (див. KNOWN_ISSUES.md).
      title: t("settings.section.notifications", "Сповіщення"),
      items: [
        {
          icon: Mail,
          label: t("settings.emailNotifications", "Email-сповіщення"),
          toggle: true,
          toggleValue: prefs.email_notifications,
          onChange: (v) => handleToggle("email_notifications", v),
        },
      ],
    },
    {
      title: t("settings.section.security", "Безпека"),
      items: [
        {
          icon: Shield,
          label: t("settings.twoFactor", "Двофакторна автентифікація"),
          toggle: true,
          // Стан береться з реальних MFA-факторів Supabase, а не з прапорця в
          // налаштуваннях: раніше тумблер лише писав boolean і нічого не робив.
          toggleValue: mfa.enabled,
          toggleDisabled: mfa.loading,
          onChange: (v) => setMfaDialog(v ? "enroll" : "disable"),
          hint: mfa.enabled
            ? t("settings.twoFactor.hintOn", "Код із TOTP-застосунку потрібен при кожному вході")
            : t("settings.twoFactor.hintOff", "Одноразові коди з Google Authenticator, 1Password тощо"),
        },
        {
          icon: Shield,
          label: t("settings.verification", "Верифікація акаунту"),
          arrow: true,
          path: "/verification",
        },
        {
          icon: Lock,
          label: t("settings.sponsorPrivacy", "Приватність спонсора"),
          arrow: true,
          path: "/app/sponsor-privacy",
        },
      ],
    },
    {
      title: t("settings.section.appearance", "Вигляд"),
      items: [
        {
          icon: Moon,
          label: t("settings.darkMode", "Темна тема"),
          toggle: true,
          toggleValue: prefs.dark_mode,
          onChange: (v) => handleToggle("dark_mode", v),
        },
        {
          icon: Globe,
          label: t("settings.languageLabel", "Мова"),
          // Назва активної мови приходить зі словника — рядок сам стає
          // «Українська» / «English» / «Deutsch» разом з перемиканням локалі.
          value: t("settings.currentLanguage", "Українська"),
        },
      ],
    },
    {
      title: t("settings.section.support", "Підтримка"),
      items: [
        { icon: HelpCircle, label: t("settings.help", "Довідка"), arrow: true, path: "/faq" },
        { icon: FileText, label: t("settings.terms", "Умови використання"), arrow: true, path: "/agb" },
        { icon: Smartphone, label: t("settings.version", "Версія"), value: "1.0.0" },
      ],
    },
  ];

  return (
    <div className="pb-8">
      <h1 className="sr-only">{t("settings.title", "Налаштування")}</h1>
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-2">
        <h2 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">
          {t("settings.title", "Налаштування")}
        </h2>
        {!tableAvailable && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {t("settings.localOnly", "Налаштування зберігаються локально (БД offline)")}
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
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    {item.hint && (
                      <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{item.hint}</p>
                    )}
                  </div>
                  {item.toggle ? (
                    <Switch
                      checked={!!item.toggleValue}
                      disabled={item.toggleDisabled}
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
          <span className="text-sm font-medium">{t("settings.signOut", "Вийти з акаунту")}</span>
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
          <span className="text-sm font-medium">
            {t("settings.deleteAccount.cta", "Видалити акаунт назавжди")}
          </span>
        </button>
        <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
          {t(
            "settings.deleteAccount.note",
            "Профіль, товари та особисті дані буде видалено безповоротно. Фінансові записи знеособлюються згідно з вимогами обліку."
          )}
        </p>
      </div>

      {mfaDialog && (
        <TwoFactorDialog mode={mfaDialog} open onOpenChange={(v) => !v && setMfaDialog(null)} mfa={mfa} />
      )}

      <Dialog open={deleteOpen} onOpenChange={(v) => !deleting && setDeleteOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.deleteAccount.title", "Видалити акаунт?")}</DialogTitle>
            <DialogDescription>
              {t(
                "settings.deleteAccount.desc",
                "Дія незворотна: профіль, оголошення і всі особисті дані буде стерто. Якщо у вас є активні угоди, спершу завершіть їх."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteOpen(false)}>
              {t("common.cancel", "Скасувати")}
            </Button>
            <Button
              data-testid="confirm-delete-account"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDeleteAccount()}
            >
              {deleting
                ? t("settings.deleteAccount.deleting", "Видаляємо…")
                : t("settings.deleteAccount.confirm", "Так, видалити")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
