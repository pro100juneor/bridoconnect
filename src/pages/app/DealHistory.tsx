import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MOCK = [
  { id:"1", creator_name:"Оксана К.", creator_flag:"🇺🇦", amount:120, status:"completed", title:"Допомога з житлом", created_at:"2026-04-12" },
  { id:"2", creator_name:"Ахмад Р.", creator_flag:"🏳️", amount:200, status:"active", title:"Їжа та одяг", created_at:"2026-04-14" },
  { id:"3", creator_name:"Марія Л.", creator_flag:"🇺🇦", amount:80, status:"completed", title:"Ліки для дитини", created_at:"2026-04-10" },
];

const statusMap: Record<string, { icon: any; label: string; color: string }> = {
  completed: { icon: CheckCircle, label: "Завершено", color: "text-success bg-success/10" },
  active: { icon: Clock, label: "Активна", color: "text-warning bg-warning/10" },
  pending: { icon: Clock, label: "Очікує", color: "text-warning bg-warning/10" },
  cancelled: { icon: XCircle, label: "Скасовано", color: "text-destructive bg-destructive/10" },
  disputed: { icon: XCircle, label: "Спір", color: "text-destructive bg-destructive/10" },
};

const DealHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("deals").select("*").or(`creator_id.eq.${user.id},sponsor_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setDeals(data && data.length > 0 ? data : MOCK); setLoading(false); });
  }, [user]);

  const list = deals.length > 0 ? deals : MOCK;
  const total = list.filter((d: any) => d.status === "completed").reduce((s: number, d: any) => s + (d.amount || 0), 0);

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-4">
        <h2 className="font-serif text-xl text-foreground mb-4">Історія угод</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{list.length}</p>
            <p className="text-[10px] text-muted-foreground">Всього</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-success">{list.filter((d: any) => d.status === "completed").length}</p>
            <p className="text-[10px] text-muted-foreground">Завершено</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">€{total}</p>
            <p className="text-[10px] text-muted-foreground">Надано</p>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="px-4 space-y-2">
          {list.map((deal: any) => {
            const s = statusMap[deal.status] || statusMap.pending;
            const name = deal.creator_name || "Користувач";
            return (
              <button key={deal.id} onClick={() => navigate(`/app/deal/${deal.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-secondary/50 text-left">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{name} {deal.creator_flag || "🏳️"}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.color}`}>{s.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{deal.title || "Угода"} · {new Date(deal.created_at).toLocaleDateString("uk")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-foreground">€{deal.amount || 0}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default DealHistory;
