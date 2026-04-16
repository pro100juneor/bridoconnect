import { useNavigate } from "react-router-dom";
import { ChevronRight, Bell, Shield, Globe, Moon, LogOut, HelpCircle, FileText, Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const Settings = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  const sections = [
    {
      title: "Сповіщення",
      items: [
        { icon: Bell, label: "Push-сповіщення", toggle: true, value: notifications, onChange: setNotifications },
      ]
    },
    {
      title: "Безпека",
      items: [
        { icon: Shield, label: "Двофакторна автентифікація", toggle: true, value: twoFactor, onChange: setTwoFactor },
      ]
    },
    {
      title: "Вигляд",
      items: [
        { icon: Moon, label: "Темна тема", toggle: true, value: darkMode, onChange: setDarkMode },
        { icon: Globe, label: "Мова", value: "Українська", arrow: true },
      ]
    },
    {
      title: "Підтримка",
      items: [
        { icon: HelpCircle, label: "Довідка", arrow: true },
        { icon: FileText, label: "Умови використання", arrow: true },
        { icon: Smartphone, label: "Версія програми", value: "1.0.0" },
      ]
    }
  ];

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-2">
        <h2 className="font-serif text-xl text-foreground">Налаштування</h2>
      </div>

      <div className="px-4 space-y-6 mt-4">
        {sections.map(section => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section.title}</p>
            <div className="bg-secondary rounded-xl overflow-hidden divide-y divide-border">
              {section.items.map(item => (
                <div key={item.label} className="flex items-center gap-3 px-4 py-3">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                  {item.toggle ? (
                    <Switch checked={item.value} onCheckedChange={item.onChange} />
                  ) : item.arrow ? (
                    <div className="flex items-center gap-2">
                      {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button className="w-full flex items-center gap-3 px-4 py-3 bg-accent/10 rounded-xl text-accent">
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Вийти з акаунту</span>
        </button>
      </div>
    </div>
  );
};
export default Settings;
