import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  CreditCard,
  TrendingUp,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/hooks/useTransactions";
import { useStripe } from "@/hooks/useStripe";
import { toast } from "@/hooks/use-toast";

const TYPE_LABEL: Record<string, string> = {
  deposit: "Поповнення",
  withdrawal: "Виведення",
  deal_payment: "Платіж по угоді",
  refund: "Повернення",
};

const QUICK_AMOUNTS = [10, 25, 50, 100, 250];

const Wallet = () => {
  const navigate = useNavigate();
  const { transactions, balance, loading, refetch } = useTransactions();
  const { createCheckout } = useStripe();

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("50");
  const [depositing, setDepositing] = useState(false);

  const handleDeposit = async () => {
    const n = Number(depositAmount);
    if (!n || n < 1) {
      toast({
        title: "Некоректна сума",
        description: "Мінімум €1",
        variant: "destructive",
      });
      return;
    }
    setDepositing(true);
    try {
      await createCheckout({ amount: n });
      // Stripe checkout робить редирект всередині createCheckout
    } catch (e: any) {
      toast({
        title: "Stripe не підключено",
        description:
          e?.message ||
          "Платежі буде активовано після підключення Stripe. Зверніться до адміністратора.",
        variant: "destructive",
      });
      setDepositing(false);
    }
  };

  const totalOut = transactions
    .filter(t => t.type === "deal_payment" || t.type === "withdrawal")
    .reduce((s, t) => s + t.amount, 0);
  const totalIn = transactions
    .filter(t => t.type === "deposit" || t.type === "refund")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="pb-8">
      <h1 className="sr-only">Гаманець</h1>
      <div className="px-4 pt-4 pb-6 bg-primary text-white rounded-b-3xl mb-4">
        <h2 className="font-serif text-xl mb-6">Гаманець</h2>
        <div className="text-center mb-6">
          <p className="text-white/60 text-sm mb-1">Доступний баланс</p>
          <p className="text-4xl font-bold">€{balance.toFixed(2)}</p>
          <p className="text-white/40 text-xs mt-1">
            ≈ ${(balance * 1.09).toFixed(0)} USD
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDepositOpen(true)}
            className="flex flex-col gap-1 h-14 bg-white/10 hover:bg-white/20 text-white border-0"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs">Поповнити</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/app/deals")}
            className="flex flex-col gap-1 h-14 bg-white/10 hover:bg-white/20 text-white border-0"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span className="text-xs">Відправити</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast({
                title: "Незабаром",
                description: "Функцію прив'язки карток додамо після підключення Stripe",
              })
            }
            className="flex flex-col gap-1 h-14 bg-white/10 hover:bg-white/20 text-white border-0"
          >
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
          </div>
          <div className="bg-secondary rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Поповнено</span>
            </div>
            <p className="text-lg font-bold text-foreground">€{totalIn.toFixed(0)}</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Транзакції</h3>
          <button
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Оновити"
          >
          </button>
        </div>

        {!loading && transactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Транзакцій ще немає. Поповніть гаманець.
          </div>
        )}

        <div className="space-y-2">
          {transactions.map(t => {
            const isOut = t.type === "deal_payment" || t.type === "withdrawal";
            return (
              <div
                key={t.id}
                onClick={() => t.deal_id && navigate(`/app/deal/${t.deal_id}`)}
                className={`flex items-center gap-3 p-3 rounded-xl border border-border ${
                  t.deal_id ? "cursor-pointer hover:bg-secondary/50" : ""
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isOut ? "bg-accent/10" : "bg-success/10"
                  }`}
                >
                  {isOut ? (
                    <ArrowUpRight className="w-5 h-5 text-accent" />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5 text-success" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {TYPE_LABEL[t.type] || t.type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString("uk", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`font-semibold text-sm ${
                    isOut ? "text-accent" : "text-success"
                  }`}
                >
                  {isOut ? "-" : "+"}€{t.amount.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deposit Dialog */}
      {depositOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
          onClick={() => !depositing && setDepositOpen(false)}
        >
          <div
            className="bg-background rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-foreground">Поповнити гаманець</h3>
              <button
                onClick={() => !depositing && setDepositOpen(false)}
                className="p-1"
                aria-label="Закрити"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {QUICK_AMOUNTS.map(a => (
                <button
                  key={a}
                  onClick={() => setDepositAmount(String(a))}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    depositAmount === String(a)
                      ? "bg-accent text-white border-accent"
                      : "border-border text-foreground"
                  }`}
                >
                  €{a}
                </button>
              ))}
            </div>
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">Сума (EUR)</label>
              <input
                type="number"
                min="1"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground"
              />
            </div>
            <Button
              onClick={handleDeposit}
              disabled={depositing || !depositAmount}
              className="w-full bg-accent hover:bg-accent/90 text-white"
            >
              {depositing ? "Відкриваємо оплату..." : `Поповнити на €${depositAmount || "0"}`}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-3">
              Оплата обробляється через Stripe · Захищено SSL
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
