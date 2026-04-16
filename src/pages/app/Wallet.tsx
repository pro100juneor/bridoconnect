import { ArrowUpRight, ArrowDownLeft, Plus, CreditCard, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const transactions = [
  { id: 1, type: "out", name: "Оксана К.", amount: -120, date: "Сьогодні, 14:32", desc: "Допомога з житлом" },
  { id: 2, type: "in", name: "Поповнення", amount: 500, date: "Вчора, 09:15", desc: "Банківський переказ" },
  { id: 3, type: "out", name: "Марія Л.", amount: -80, date: "14 кві", desc: "Ліки для дитини" },
  { id: 4, type: "out", name: "Ахмад Р.", amount: -200, date: "12 кві", desc: "Їжа та одяг" },
  { id: 5, type: "in", name: "Поповнення", amount: 300, date: "10 кві", desc: "PayPal" },
];

const Wallet = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-6 bg-primary text-white rounded-b-3xl mb-4">
        <h2 className="font-serif text-xl mb-6">Гаманець</h2>
        <div className="text-center mb-6">
          <p className="text-white/60 text-sm mb-1">Доступний баланс</p>
          <p className="text-4xl font-bold">€1 480</p>
          <p className="text-white/60 text-xs mt-1">≈ $1 620 USD</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" className="flex flex-col gap-1 h-14 bg-white/10 hover:bg-white/20 text-white border-0">
            <Plus className="w-4 h-4" />
            <span className="text-xs">Поповнити</span>
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
            <p className="text-lg font-bold text-foreground">€620</p>
            <p className="text-xs text-muted-foreground">цього місяця</p>
          </div>
          <div className="bg-secondary rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Поповнено</span>
            </div>
            <p className="text-lg font-bold text-foreground">€800</p>
            <p className="text-xs text-muted-foreground">цього місяця</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <h3 className="font-semibold text-foreground mb-3">Останні транзакції</h3>
        <div className="space-y-2">
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "out" ? "bg-accent/10" : "bg-success/10"}`}>
                {tx.type === "out" ? <ArrowUpRight className="w-5 h-5 text-accent" /> : <ArrowDownLeft className="w-5 h-5 text-success" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{tx.name}</p>
                <p className="text-xs text-muted-foreground">{tx.desc} · {tx.date}</p>
              </div>
              <span className={`font-semibold text-sm ${tx.amount < 0 ? "text-accent" : "text-success"}`}>
                {tx.amount > 0 ? "+" : ""}€{Math.abs(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Wallet;
