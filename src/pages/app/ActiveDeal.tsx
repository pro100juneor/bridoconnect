import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Shield, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStripe } from "@/hooks/useStripe";
import { usePaypal } from "@/hooks/usePaypal";
import { toast } from "@/hooks/use-toast";
import ReviewModal from "@/components/ReviewModal";
import { Confetti } from "@/components/Confetti";
import { tap, notify } from "@/lib/native";

const MOCK_DEAL = {
  id: "1",
  title: "Допомога з орендою житла",
  description: "Сім'я з Харкова потребує тимчасового житла.",
  amount: 320,
  raised: 200,
  status: "active",
  category: "Житло",
  urgent: false,
  creator_id: "u1",
  creator_name: "Оксана К.",
  creator_flag: "🇺🇦",
  creator_city: "Харків",
};

const ActiveDeal = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { createCheckout, releaseEscrow } = useStripe();
  const { createOrder: createPaypalOrder } = usePaypal();

  const [deal, setDeal] = useState<any>(null);
  const [dealLoading, setDealLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [payMethod, setPayMethod] = useState<"stripe" | "paypal">("stripe");

  useEffect(() => {
    if (!id) return;
    setDealLoading(true);
    supabase
      .from("deals")
      .select("*, profiles!creator_id(name, country, city, rating, verified, stripe_connect_status)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d: any = data;
          const p = d.profiles || {};
          setDeal({
            ...d,
            creator_name: p.name || "Користувач",
            creator_flag: p.country === "Україна" ? "🇺🇦" : "🏳️",
            creator_city: p.city || "",
            creator_rating: p.rating || 0,
            creator_verified: p.verified || false,
            creator_connect_status: p.stripe_connect_status || "none",
          });
        } else {
          // Deal genuinely not found in DB. Don't fall through to MOCK_DEAL
          // — that previously rendered a fake "Анна С. з Києва" payment UI.
          setDeal(null);
        }
        setDealLoading(false);
      });
  }, [id]);

  const steps = (() => {
    const s = deal?.status || "active";
    return [
      { label: "Угоду відкрито", done: true },
      { label: "Кошти зарезервовано", done: (deal?.raised || 0) > 0 },
      { label: "Підтвердження", done: s === "completed" || s === "active" },
      { label: "Кошти відправлено", done: s === "completed" },
      { label: "Завершено", done: s === "completed" },
    ];
  })();

  const handlePay = async () => {
    const n = Number(amount);
    if (!n || n < 1) {
      toast({ title: "Вкажіть суму", description: "Введіть суму від €1", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({
        title: "Потрібен вхід",
        description: "Увійдіть, щоб підтримати угоду",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    if (payMethod === "stripe" && deal?.creator_connect_status !== "enabled") {
      void notify("error");
      toast({
        title: "Отримувач ще не підключив Stripe",
        description: "Спробуйте PayPal або зверніться пізніше.",
        variant: "destructive",
      });
      return;
    }
    void tap("medium");
    setPaying(true);
    try {
      void notify("success");
      if (payMethod === "paypal") {
        if (!id) throw new Error("deal id missing");
        await createPaypalOrder({ amount: n, dealId: id });
      } else {
        await createCheckout({ amount: n, dealId: id });
      }
    } catch (e: any) {
      void notify("error");
      toast({
        title: "Помилка платежу",
        description: e?.message || "Спробуйте ще раз.",
        variant: "destructive",
      });
      setPaying(false);
    }
  };

  const handleReleaseEscrow = async () => {
    if (!id) return;
    void tap("medium");
    setReleasing(true);
    try {
      await releaseEscrow(id);
      void notify("success");
      toast({ title: "Готово", description: "Кошти переведено отримувачу." });
      setDeal((prev: any) =>
        prev ? { ...prev, status: "completed", escrow_released_at: new Date().toISOString() } : prev
      );
      setShowConfetti(true);
      setShowReview(true);
    } catch (e: any) {
      void notify("error");
      toast({
        title: "Не вдалося завершити",
        description: e?.message || "Спробуйте ще раз.",
        variant: "destructive",
      });
    } finally {
      setReleasing(false);
    }
  };

  const [showConfetti, setShowConfetti] = useState(false);

  if (dealLoading) {
    // DESIGN.md §Loading: skeleton, not spinner
    return (
      <div className="px-4 pt-4 space-y-3">
        <div className="h-32 rounded-2xl bg-secondary animate-pulse" />
        <div className="h-40 rounded-2xl bg-secondary animate-pulse" />
        <div className="h-24 rounded-2xl bg-secondary animate-pulse" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <h2 className="font-serif text-xl text-foreground mb-2">Угоду не знайдено</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Можливо, її було видалено або посилання застаріле.
        </p>
        <Button variant="outline" onClick={() => navigate("/app")}>
          На стрічку
        </Button>
      </div>
    );
  }

  const d = deal;
  const pct = d.amount > 0 ? Math.round((d.raised / d.amount) * 100) : 0;
  const initials = (d.creator_name || "?")
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const finished = d.status === "completed" || d.status === "cancelled";

  return (
    <main className="pb-8 relative">
      <Confetti trigger={showConfetti} />
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">Угода</h2>
        <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full font-medium">
          {d.status === "completed" ? "Завершено" : d.status === "disputed" ? "Спір" : "В процесі"}
        </span>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="relative p-4 rounded-2xl bg-primary/5 border border-primary/20 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {d.creator_name} {d.creator_flag}
              </p>
              <p className="text-xs text-muted-foreground">{d.creator_city}</p>
            </div>
            <button
              onClick={() => {
                void tap("light");
                navigate(`/app/chat/${id}`);
              }}
              className="ml-auto min-h-[44px] min-w-[44px] bg-primary/10 rounded-2xl flex items-center justify-center transition-transform duration-150 hover:-translate-y-px"
              aria-label="Чат"
            >
              <MessageCircle className="w-5 h-5 text-primary" strokeWidth={1.75} />
            </button>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{d.title}</p>
          <p className="text-xs text-muted-foreground mb-3">{d.description}</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold text-foreground">€{d.raised}</span>
            <span className="text-xs text-muted-foreground">
              з €{d.amount} · {pct}%
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        {!finished && (
          <div className="relative p-4 rounded-2xl border border-border overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
            <h3 className="font-semibold text-foreground mb-3">Підтримати угоду</h3>
            <div className="flex gap-2 mb-3" role="tablist" aria-label="Спосіб оплати">
              {(["stripe", "paypal"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  data-testid={`pay-method-${m}`}
                  aria-selected={payMethod === m}
                  onClick={() => setPayMethod(m)}
                  className={`flex-1 min-h-[44px] py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                    payMethod === m ? "bg-primary text-white border-primary" : "border-border text-foreground"
                  }`}
                >
                  {m === "stripe" ? "Картка (Stripe)" : "PayPal"}
                </button>
              ))}
            </div>
            {payMethod === "stripe" && deal?.creator_connect_status !== "enabled" && (
              <div className="mb-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-xs text-warning font-medium">
                  Отримувач ще не завершив підключення Stripe. Оплата буде доступна після верифікації або
                  через PayPal.
                </p>
              </div>
            )}
            <div className="flex gap-2 mb-3">
              {["10", "25", "50", "100"].map((a) => (
                <button
                  key={a}
                  data-testid={`donate-amount-${a}`}
                  onClick={() => setAmount(a)}
                  className={`flex-1 min-h-[44px] py-2 rounded-xl text-sm font-semibold border transition-all duration-150 hover:-translate-y-px ${
                    amount === a ? "bg-accent text-white border-accent" : "border-border text-foreground"
                  }`}
                >
                  €{a}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Інша сума…"
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none text-foreground mb-3 focus:ring-2 focus:ring-accent/30"
            />
            <Button
              data-testid="donate-submit"
              className="w-full bg-accent hover:bg-accent/90 text-white transition-transform duration-150 hover:-translate-y-px"
              disabled={
                paying || !amount || (payMethod === "stripe" && deal?.creator_connect_status !== "enabled")
              }
              onClick={handlePay}
            >
              {paying ? "Відкриваємо оплату…" : `Підтримати €${amount || "…"}`}
            </Button>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Статус
          </h3>
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 ${
                      step.done ? "bg-success text-white" : "bg-secondary border-2 border-border"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    )}
                  </div>
                  <p
                    className={`text-sm pt-1 ${step.done ? "text-foreground font-medium" : "text-muted-foreground"}`}
                  >
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-success/10 rounded-2xl">
          <Shield className="w-5 h-5 text-success shrink-0 mt-0.5" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-semibold text-foreground">Захист BridoConnect</p>
            <p className="text-xs text-muted-foreground">
              Кошти переводяться тільки після підтвердження обох сторін
            </p>
          </div>
        </div>

        {!finished && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10 transition-transform duration-150 hover:-translate-y-px"
              onClick={() => {
                void tap("light");
                navigate(`/app/dispute/${id}`);
              }}
            >
              <AlertTriangle className="w-4 h-4 mr-2" strokeWidth={1.75} /> Спір
            </Button>
            <Button
              data-testid="release-escrow"
              className="flex-1 bg-success hover:bg-success/90 text-white transition-transform duration-150 hover:-translate-y-px"
              disabled={releasing || user?.id !== d.sponsor_id || (d.raised || 0) <= 0}
              onClick={handleReleaseEscrow}
            >
              <CheckCircle className="w-4 h-4 mr-2" strokeWidth={1.75} />{" "}
              {releasing ? "Завершуємо…" : "Підтвердити отримання"}
            </Button>
          </div>
        )}
      </div>

      {showReview && (
        <ReviewModal
          dealId={id || ""}
          revieweeId={d.creator_id || "u1"}
          revieweeName={d.creator_name || "Користувач"}
          onClose={() => setShowReview(false)}
          onSuccess={() => {
            void notify("success");
            setShowConfetti(true);
            setShowReview(false);
            setTimeout(() => navigate("/app/deals"), 2200);
          }}
        />
      )}
    </main>
  );
};

export default ActiveDeal;
