import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Bell, MessageCircle, CheckCircle, DollarSign, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PullToRefresh } from "@/components/PullToRefresh";
import { tap } from "@/lib/native";

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
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifs(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void refetch();
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
  }, [user, refetch]);

  const markAllRead = async () => {
    if (!user) return;
    void tap("light");
    await supabase.from("notifications")
      .update({ read: true })
      .eq("user_id", user.id).eq("read", false);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const onRowTap = (n: any) => {
    void tap("light");
    void markRead(n.id);
    if (n.deal_id) navigate(`/app/deal/${n.deal_id}`);
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">Сповіщення</h2>
          {unreadCount > 0 && (
            <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-accent font-medium min-h-[44px] px-2 transition-transform duration-150 hover:-translate-y-px"
          >
            Всі прочитано
          </button>
        )}
      </div>

      {loading && (
        // DESIGN.md §Loading: 5 skeleton rows
        <div className="space-y-2 px-4 mt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      )}

      {!loading && notifs.length === 0 && (
        <div className="text-center py-16 px-6">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            {/* SVG envelope with z-z sleep indicator per DESIGN.md §States */}
            <svg viewBox="0 0 48 48" className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="6" y="14" width="28" height="22" rx="3" />
              <path d="M6 17l14 10 14-10" />
              <path d="M34 12h8M36 18h6M37 24h5" />
            </svg>
          </div>
          <p className="font-semibold text-foreground mb-2">Сповіщень немає</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Тут з'являться сповіщення про угоди,<br />повідомлення та донати.
          </p>
        </div>
      )}

      <PullToRefresh onRefresh={refetch}>
        <div className="px-4 mt-2 space-y-2">
          {notifs.map((n: any, idx: number) => {
            const Icon = TYPE_ICON[n.type] || Bell;
            const colorClass = TYPE_COLOR[n.type] || "text-muted-foreground bg-secondary";
            return (
              <motion.div
                key={n.id}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx, 8) * 0.04, duration: 0.2 }}
                onClick={() => onRowTap(n)}
                className={`flex items-start gap-3 px-3 py-3 min-h-[44px] rounded-2xl cursor-pointer transition-all duration-150 hover:-translate-y-px ${
                  !n.read ? "bg-accent/5" : "hover:bg-secondary/50"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
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
                {!n.read && <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" aria-label="Непрочитано" />}
              </motion.div>
            );
          })}
        </div>
      </PullToRefresh>
    </div>
  );
};
export default Notifications;
