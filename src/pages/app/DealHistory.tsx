import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";

const deals = [
  { id: "1", name: "Оксана К.", flag: "🇺🇦", amount: 120, status: "completed", desc: "Допомога з житлом", date: "12 кві 2026" },
  { id: "2", name: "Ахмад Р.", flag: "🏳️", amount: 200, status: "active", desc: "Їжа та одяг", date: "14 кві 2026" },
  { id: "3", name: "Марія Л.", flag: "🇺🇦", amount: 80, status: "completed", desc: "Ліки для дитини", date: "10 кві 2026" },
  { id: "4", name: "Yusef A.", flag: "🏳️", amount: 150, status: "cancelled", desc: "Транспорт", date: "08 кві 2026" },
  { id: "5", name: "Надія С.", flag: "🇺🇦", amount: 300, status: "completed", desc: "Оренда квартири", date: "05 кві 2026" },
];

const statusMap = {
  completed: { icon: CheckCircle, label: "Завершено", color: "text-success bg-success/10" },
  active: { icon: Clock, label: "Активна", color: "text-warning bg-warning/10" },
  cancelled: { icon: XCircle, label: "Скасовано", color: "text-destructive bg-destructive/10" },
};

const DealHistory = () => {
  const navigate = useNavigate();
  const total = deals.filter(d => d.status === "completed").reduce((s, d) => s + d.amount, 0);

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-4">
        <h2 className="font-serif text-xl text-foreground mb-4">Історія угод</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{deals.length}</p>
            <p className="text-[10px] text-muted-foreground">Всього</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-success">{deals.filter(d=>d.status==="completed").length}</p>
            <p className="text-[10px] text-muted-foreground">Завершено</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">€{total}</p>
            <p className="text-[10px] text-muted-foreground">Надано</p>
          </div>
        </div>
      </div>
      <div className="px-4 space-y-2">
        {deals.map(deal => {
          const s = statusMap[deal.status];
          return (
            <button key={deal.id} onClick={() => navigate(`/app/deal/${deal.id}`)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-secondary/50 text-left">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {deal.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-foreground">{deal.name} {deal.flag}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.color}`}>{s.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{deal.desc} · {deal.date}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-foreground">€{deal.amount}</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default DealHistory;
