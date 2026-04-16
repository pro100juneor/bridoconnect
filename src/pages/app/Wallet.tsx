import { ArrowUpRight, ArrowDownLeft, Plus, CreditCard, TrendingUp, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStripe } from "@/hooks/useStripe";
import { useTransactions } from "@/hooks/useTransactions";
import { toast } from "@/hooks/use-toast";

const MOCK_TX = [
  { id:"1", type:"deposit", amount:500, created_at:new Date().toISOString(), deal_id:null, status:"completed" },
  { id:"2", type:"deal_payment", amount:120, created_at:new Date(Date.now()-86400000).toISOString(), deal_id:"d1", status:"completed" },
  { id:"3", type:"deal_payment", amount:80, created_at:new Date(Date.now()-172800000).toISOString(), deal_id:"d2", status:"completed" },
];

const typeLabel: Record<string, string> = {
  deposit: "Поповнення",
  withdrawal: "Виведення",
  deal_payment: "Платіж по угоді",
  refund: "Повернення",
};

const Wallet = () => {
  const navigate = useNavigate();
  const { createCheckout } = useStripe();
  const { transactions: realTx, balance, loading } = useTransactions();
  const [depositing, setDepositing] = useState(false);

  const tx = realTx.length > 0 ? realTx : MOCK_TX;
  const displayBalance = realTx.length > 0 ? balance : 480;
  const totalOut = tx.filter((t: any) => t.type === "deal_payment" || t.type === "withdrawal").reduce((s: number, t: any) => s + t.amount, 0);
  const totalIn = tx.filter((t: any) => t.type === "deposit" || t.type === "refund").reduce((s: number, t: any) => s + t.amount, 0);

  const handleDeposit = async () => {
    setDepositing(true);
    try {
      await createCheckout({ amount: 50 });
    } catch (e) {
      toast({ title: "Помилка оплати", description: "Не вдалось відкрити Stripe", variant: "destructive" });
      setDepositing(false);
    }
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-6 bg-primary text-white rounded-b-3xl mb-4">
        <h2 className="font-serif text-xl mb-6">Гаманець</h2>
        <div className="text-center mb-6">
          <p className="text-white/60 text-sm mb-1">Доступний баланс</p>
          <p className="text-4xl font-bold">€{displayBalance.toFixed(2)}</p>
          <p className="text-white/40 text-xs mt-1">≈ ${(displayBalance * 1.09).toFixed(0)} USD</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" onClick={handleDeposit} disabled={depositing}
            className="flex flex-col gap-1 h-14 bg-white/10 hover:bg-white/20 text-white border-0">
            <Plus className="w-4 h-4" />
            <span className="text-xs">{depositing ? "..." : "Поповнити"}</span>
          </Button>
          <Button variant="secondary" size="sm" className="flex flex-col gap-1 h-14 bg-white/10 hover:bg-white/20 text-white border-0">
            <ArrowUpRight className="w-4 h-4" />
            <span className="text-xs">Відправити</span>
          </Button>
          <Button variant="secondary" size="sm" className="flex flex-col gap-1 h-14 bg-white/10 hover:bg-white/20 text-white border-0">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs">Картка</span>
          </Button>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">Відправлено</span>
            </div>
            <p className="text-lg font-bold text-foreground">€{totalOut.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">цього місяця</p>
          </div>
          <div className="bg-secondary rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Поповнено</span>
            </div>
            <p className="text-lg font-bold text-foreground">€{totalIn.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">цього місяця</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Транзакції</h3>
          {loading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
        </div>
        <div className="space-y-2">
          {(tx as any[]).map((t: any) => {
            const isOut = t.type === "deal_payment" || t.type === "withdrawal";
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border"
                onClick={() => t.deal_id && navigate(`/app/deal/${t.deal_id}`)}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOut ? "bg-accent/10" : "bg-success/10"}`}>
                  {isOut ? <ArrowUpRight className="w-5 h-5 text-accent" /> : <ArrowDownLeft className="w-5 h-5 text-success" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{typeLabel[t.type] || t.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString("uk", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                  </p>
                </div>
                <span className={`font-semibold text-sm ${isOut ? "text-accent" : "text-success"}`}>
                  {isOut ? "-" : "+"}€{t.amount.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import { useState } from "react";
export default Wallet;
