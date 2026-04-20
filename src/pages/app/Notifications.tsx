import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, CheckCircle, DollarSign, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const TYPE_ICON: Record<string, any> = {
  deal_accepted: CheckCircle,
  deal_completed: CheckCircle,
  new_message: MessageCircle,
  donation_received: DollarSign,
  review_received: Star,
  system: Bell,
};

const TYPE_COLOR: Record<string, string> = {
  deal_accepted: "text-success bg-success/10",
  deal_completed: "text-success bg-success/10",
  new_message: "text-accent bg-accent/10",
  donation_received: "text-warning bg-warning/10",
  review_received: "text-yellow-500 bg-yellow-500/10",
  system: "text-muted-foreground bg-secondary",
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    supabase.from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setNotifs(data);
        setLoading(false);
      });

    // Realtime
    const channel = supabase
      .channel(`notifs_${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifs(prev => [payload.new as any, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications")
      .update({ read: true })
      .eq("user_id", user.id).eq("read", false);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-xl text-foreground">Сповіщення</h2>
          {unreadCount > 0 && (
            <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-accent font-medium">
            Всі прочитано
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && notifs.length === 0 && (
        <div className="text-center py-16 px-6">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground mb-2">Сповіщень немає</p>
          <p className="text-sm text-muted-foreground">
            Тут з'являться сповіщення про угоди, повідомлення та донати.
          </p>
        </div>
      )}

      <div className="divide-y divide-border">
        {notifs.map((n: any) => {
          const Icon = TYPE_ICON[n.type] || Bell;
          const colorClass = TYPE_COLOR[n.type] || "text-muted-foreground bg-secondary";
          return (
            <div key={n.id}
              onClick={() => {
                markRead(n.id);
                if (n.deal_id) navigate(`/app/deal/${n.deal_id}`);
              }}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors ${!n.read ? "bg-accent/5" : ""}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                  {n.title}
                </p>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleDateString("uk", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Notifications;
