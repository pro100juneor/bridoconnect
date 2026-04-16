import { useEffect, useState } from "react";
import { Bell, CheckCheck, Heart, MessageCircle, ShieldCheck, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MOCK_NOTIFS = [
  { id:"1", icon:Heart, color:"text-accent bg-accent/10", title:"Нова пожертва", desc:"Ахмад Р. підтримав вас на €50", time:"5 хв тому", read:false },
  { id:"2", icon:MessageCircle, color:"text-primary bg-primary/10", title:"Нове повідомлення", desc:"Оксана К.: Дякую за підтримку!", time:"32 хв тому", read:false },
  { id:"3", icon:ShieldCheck, color:"text-success bg-success/10", title:"Верифікацію підтверджено", desc:"Ваш акаунт верифіковано. Дякуємо!", time:"2 год тому", read:true },
  { id:"4", icon:DollarSign, color:"text-warning bg-warning/10", title:"Переказ отримано", desc:"€120 зараховано на гаманець", time:"Вчора", read:true },
];

const Notifications = () => {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const [readAll, setReadAll] = useState(false);

  const markAll = () => {
    setNotifs(n => n.map(x => ({...x, read:true})));
    setReadAll(true);
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Сповіщення</h2>
        <button onClick={markAll} className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCheck className="w-4 h-4" /> Всі прочитані
        </button>
      </div>
      <div className="divide-y divide-border">
        {notifs.map(n => (
          <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.read && !readAll ? "bg-accent/5" : ""}`}
            onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? {...x, read:true} : x))}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${n.color}`}>
              <n.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                {!n.read && !readAll && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              <p className="text-xs text-muted-foreground">{n.desc}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Notifications;
