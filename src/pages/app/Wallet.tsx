import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Plus, CreditCard, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStripe } from "@/hooks/useStripe";

const MOCK_TX = [
  { id:"1", type:"out", name:"Оксана К.", amount:-120, date:"Сьогодні, 14:32", desc:"Допомога з житлом" },
  { id:"2", type:"in", name:"Поповнення", amount:500, date:"Вчора, 09:15", desc:"Банківський переказ" },
  { id:"3", type:"out", name:"Марія Л.", amount:-80, date:"14 кві", desc:"Ліки для дитини" },
];

const Wallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createCheckout } = useStripe();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("transactions").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => {
        setTransactions(data || []);
        setLoading(false);
      });
  }, [user]);

  const tx = transactions.length > 0 ? transactions : MOCK_TX;
  const totalOut = (transactions.length > 0 ? transactions : MOCK_TX)
    .filter((t: any) => t.type === "out" || t.amount < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
  const totalIn = (transactions.length > 0 ? transactions : MOCK_TX)
    .filter((t: any) => t.type === "in" || t.amount > 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);

  const handleDeposit = async () => {
    setDepositing(true);
    try { await createCheckout({ amount: 50 }); } catch { setDepositing(false); }
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-6 bg-primary text-white rounded-b-3xl mb-4">
        <h2 className="font-serif text-xl mb-6">Гаманець</h2>
        <div className="text-center mb-6">
          <p className="text-white/60 text-sm mb-1">Доступний баланс</p>
          <p className="text-4xl font-bold">€{(totalIn - totalOut).toFixed(2)}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" onClick={handleDeposit} disabled={depositing}
            className="flex flex-col gap-1 h-14 bg-white/10 hover:bg-white/20 text-white border-0">
            <Plus className="w-4 h-4" /><span className="text-xs">{depositing ? "..." : "Поповнити"}</span>
          </Button>
          <Button variant="secondary" size="sm" className="flex flex-col gap-1 h-14 bg-white/10 hover:bg-white/20 text-white border-0">
            <ArrowUpRight className="w-4 h-4" /><span className="text-xs">Відправити</span>
          </Button>
          <Button variant="secondary" size="sm" className="flex flex-col gap-1 h-14 bg-white/10 hover:bg-white/20 text-white border-0">
            <CreditCard className="w-4 h-4" /><span className="text-xs">Картка</span>
          </Button>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1"><ArrowUpRight className="w-4 h-4 text-accent" /><span className="text-xs text-muted-foreground">Відправлено</span></div>
            <p className="text-lg font-bold text-foreground">€{totalOut.toFixed(0)}</p>
          </div>
          <div className="bg-secondary rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-success" /><span className="text-xs text-muted-foreground">Поповнено</span></div>
            <p className="text-lg font-bold text-foreground">€{totalIn.toFixed(0)}</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <h3 className="font-semibold text-foreground mb-3">Транзакції</h3>
        {loading ? (
          <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"/></div>
        ) : (
          <div className="space-y-2">
            {(tx as any[]).map((t: any) => {
              const isOut = t.type === "out" || t.amount < 0;
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOut ? "bg-accent/10" : "bg-success/10"}`}>
                    {isOut ? <ArrowUpRight className="w-5 h-5 text-accent" /> : <ArrowDownLeft className="w-5 h-5 text-success" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{t.name || (isOut ? "Переказ" : "Поповнення")}</p>
                    <p className="text-xs text-muted-foreground">{t.desc || t.type} · {t.date || new Date(t.created_at).toLocaleDateString("uk")}</p>
                  </div>
                  <span className={`font-semibold text-sm ${isOut ? "text-accent" : "text-success"}`}>
                    {isOut ? "-" : "+"}€{Math.abs(t.amount).toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default Wallet;
