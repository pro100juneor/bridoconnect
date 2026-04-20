import { useEffect, useState } from "react";
import { Bell, CheckCheck, Heart, MessageCircle, ShieldCheck, DollarSign, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ICON_MAP: Record<string, any> = {
  donation: Heart,
  message: MessageCircle,
  verification: ShieldCheck,
  deal_request: DollarSign,
  system: Info,
};
const COLOR_MAP: Record<string, string> = {
  donation: "text-accent bg-accent/10",
  message: "text-primary bg-primary/10",
  verification: "text-success bg-success/10",
  deal_request: "text-warning bg-warning/10",
  system: "text-muted-foreground bg-secondary",
};
const MOCK = [
  { id:"1", type:"donation", title:"Нова пожертва", description:"Ахмад Р. підтримав вас на €50", read:false, created_at:new Date().toISOString() },
  { id:"2", type:"message", title:"Нове повідомлення", description:"Оксана К.: Дякую за підтримку!", read:false, created_at:new Date(Date.now()-1800000).toISOString() },
  { id:"3", type:"verification", title:"Верифікацію підтверджено", description:"Ваш акаунт верифіковано!", read:true, created_at:new Date(Date.now()-7200000).toISOString() },
  { id:"4", type:"deal_request", title:"Переказ отримано", description:"€120 зараховано на гаманець", read:true, created_at:new Date(Date.now()-86400000).toISOString() },
];

const timeAgo = (d: string) => {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60000) return "Щойно";
  if (ms < 3600000) return `${Math.floor(ms/60000)} хв тому`;
  if (ms < 86400000) return `${Math.floor(ms/3600000)} год тому`;
  return `${Math.floor(ms/86400000)} дн тому`;
};

const Notifications = () => {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setNotifs(MOCK); setLoading(false); return; }
    supabase.from("notifications").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { setNotifs(data && data.length > 0 ? data : MOCK); setLoading(false); });

    const channel = supabase.channel(`notif_${user.id}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"notifications", filter:`user_id=eq.${user.id}` },
        (p) => setNotifs(prev => [p.new, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markRead = async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (user) await supabase.from("notifications").update({ read: true }).eq("id", id);
  };
  const markAll = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    if (user) await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">
          Сповіщення {unread > 0 && <span className="ml-2 text-xs bg-accent text-white px-2 py-0.5 rounded-full">{unread}</span>}
        </h2>
        {unread > 0 && (
          <button onClick={markAll} className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCheck className="w-4 h-4" /> Всі прочитані
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Сповіщень немає</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {notifs.map(n => {
            const Icon = ICON_MAP[n.type] || Info;
            const color = COLOR_MAP[n.type] || COLOR_MAP.system;
            return (
              <div key={n.id} onClick={() => markRead(n.id)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer ${!n.read ? "bg-accent/5 hover:bg-accent/10" : "hover:bg-secondary/50"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                  </div>
                  {n.description && <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default Notifications;
