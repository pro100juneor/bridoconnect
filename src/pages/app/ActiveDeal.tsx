import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Shield, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ActiveDeal = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const steps = [
    { label: "Угоду відкрито", done: true, date: "14 кві, 10:00" },
    { label: "Кошти зарезервовано", done: true, date: "14 кві, 10:15" },
    { label: "Підтвердження виконавця", done: true, date: "14 кві, 11:30" },
    { label: "Кошти відправлено", done: false, date: "Очікується" },
    { label: "Угода завершена", done: false, date: "—" },
  ];

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Активна угода</h2>
        <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full font-medium">В процесі</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">ОК</div>
            <div>
              <p className="font-semibold text-foreground">Оксана К. 🇺🇦</p>
              <p className="text-xs text-muted-foreground">Харків · ⭐ 4.8</p>
            </div>
            <button onClick={() => navigate(`/app/chat/${id}`)} className="ml-auto p-2 bg-primary/10 rounded-lg">
              <MessageCircle className="w-5 h-5 text-primary" />
            </button>
          </div>
          <p className="text-sm text-foreground font-medium">Допомога з орендою житла для сім'ї</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-foreground">€200</span>
            <span className="text-xs text-muted-foreground">з €320</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full mt-2">
            <div className="h-full w-[62%] bg-accent rounded-full" />
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Статус угоди
          </h3>
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 ${step.done ? "bg-success text-white" : "bg-secondary border-2 border-border"}`}>
                    {step.done ? <CheckCircle className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-success/10 rounded-xl">
          <Shield className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Захист BridoConnect</p>
            <p className="text-xs text-muted-foreground">Кошти будуть переведені тільки після підтвердження обох сторін</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10">
            <AlertTriangle className="w-4 h-4 mr-2" /> Спір
          </Button>
          <Button className="flex-1 bg-success hover:bg-success/90 text-white">
            <CheckCircle className="w-4 h-4 mr-2" /> Підтвердити
          </Button>
        </div>
      </div>
    </div>
  );
};
export default ActiveDeal;
