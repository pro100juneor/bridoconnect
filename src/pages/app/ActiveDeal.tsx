import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Shield, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStripe } from "@/hooks/useStripe";
import ReviewModal from "@/components/ReviewModal";

const MOCK_DEAL = {
  id:"1", title:"Допомога з орендою житла", description:"Сім'я з Харкова потребує тимчасового житла.", amount:320, raised:200,
  status:"active", category:"Житло", urgent:false, creator_name:"Оксана К.", creator_flag:"🇺🇦", creator_city:"Харків",
};

const steps = [
  { label: "Угоду відкрито", done: true },
  { label: "Кошти зарезервовано", done: true },
  { label: "Підтвердження", done: true },
  { label: "Кошти відправлено", done: false },
  { label: "Завершено", done: false },
];

const ActiveDeal = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { createCheckout } = useStripe();
  const [deal, setDeal] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!id) return;
    supabase.from("deals").select("*").eq("id", id).single()
      .then(({ data }) => { if (data) setDeal(data); else setDeal(MOCK_DEAL); });
  }, [id]);

  const d = deal || MOCK_DEAL;
  const pct = d.amount > 0 ? Math.round((d.raised / d.amount) * 100) : 62;

  const handlePay = async () => {
    const amt = parseFloat(amount) || 50;
    setPaying(true);
    try { await createCheckout({ dealId: id, amount: amt }); } catch { setPaying(false); }
  };

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Угода</h2>
        <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full font-medium">В процесі</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
              {(d.creator_name || "?").slice(0,2)}
            </div>
            <div>
              <p className="font-semibold text-foreground">{d.creator_name || "Користувач"} {d.creator_flag || "🏳️"}</p>
              <p className="text-xs text-muted-foreground">{d.creator_city || ""}</p>
            </div>
            <button onClick={() => navigate(`/app/chat/${id}`)} className="ml-auto p-2 bg-primary/10 rounded-lg">
              <MessageCircle className="w-5 h-5 text-primary" />
            </button>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{d.title}</p>
          <p className="text-xs text-muted-foreground mb-3">{d.description}</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold text-foreground">€{d.raised}</span>
            <span className="text-xs text-muted-foreground">з €{d.amount} · {pct}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full">
            <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border">
          <h3 className="font-semibold text-foreground mb-3">Підтримати угоду</h3>
          <div className="flex gap-2 mb-3">
            {["10","25","50","100"].map(a => (
              <button key={a} onClick={() => setAmount(a)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${amount === a ? "bg-accent text-white border-accent" : "border-border text-foreground"}`}>
                €{a}
              </button>
            ))}
          </div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Інша сума..."
            className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none text-foreground mb-3" />
          <Button className="w-full bg-accent hover:bg-accent/90 text-white" disabled={paying} onClick={handlePay}>
            {paying ? "Відкриваємо оплату..." : `Підтримати €${amount || "..."}`}
          </Button>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Статус</h3>
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 ${step.done ? "bg-success text-white" : "bg-secondary border-2 border-border"}`}>
                    {step.done ? <CheckCircle className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground" />}
                  </div>
                  <p className={`text-sm pt-1 ${step.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{step.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-success/10 rounded-xl">
          <Shield className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Захист BridoConnect</p>
            <p className="text-xs text-muted-foreground">Кошти переводяться тільки після підтвердження обох сторін</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => navigate(`/app/dispute/${id}`)}>
            <AlertTriangle className="w-4 h-4 mr-2" /> Спір
          </Button>
          <Button className="flex-1 bg-success hover:bg-success/90 text-white" onClick={() => setShowReview(true)}>
            <CheckCircle className="w-4 h-4 mr-2" /> Завершити
          </Button>
        </div>
      </div>

      {showReview && (
        <ReviewModal dealId={id || ""} revieweeId={d.creator_id || "u1"} revieweeName={d.creator_name || "Користувач"}
          onClose={() => setShowReview(false)} onSuccess={() => { setShowReview(false); navigate("/app/deals"); }} />
      )}
    </div>
  );
};
export default ActiveDeal;
