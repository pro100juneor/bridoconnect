import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tap, notify } from "@/lib/native";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from "@/hooks/useCurrency";
import { useStripe } from "@/hooks/useStripe";

const Cart = () => {
  const navigate = useNavigate();
  const { items, remove, totalCents } = useCart();
  const { convert, code } = useCurrency();
  const { checkoutCart } = useStripe();
  const [paying, setPaying] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    void tap("medium");
    setPaying(true);
    try {
      await checkoutCart({ productIds: items.map((i) => i.productId), currency: code });
    } catch (e) {
      void notify("error");
      alert(e instanceof Error ? e.message : "Не вдалося почати оплату");
      setPaying(false);
    }
  };

  return (
    <main className="pb-28">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">Кошик</h2>
      </div>

      {items.length === 0 ? (
        <div className="px-4 mt-16 flex flex-col items-center text-center">
          <ShoppingCart
            className="w-12 h-12 text-muted-foreground/30 mb-3"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground mb-4">Кошик порожній</p>
          <Button variant="outline" onClick={() => navigate("/app/shop")}>
            До магазину
          </Button>
        </div>
      ) : (
        <>
          <div className="px-4 space-y-3">
            {items.map((i) => (
              <div
                key={i.productId}
                className="relative flex items-center gap-3 p-3 rounded-2xl border border-border overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
              >
                <button
                  onClick={() => {
                    void tap("light");
                    navigate(`/app/shop/${i.productId}`);
                  }}
                  className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden"
                >
                  {i.image ? (
                    <img src={i.image} alt={i.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-muted-foreground/40" strokeWidth={1.75} />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">{i.title}</p>
                  <p className="text-sm font-bold text-foreground mt-1">{convert(i.priceCents).formatted}</p>
                </div>
                <button
                  onClick={() => {
                    void tap("light");
                    remove(i.productId);
                  }}
                  aria-label="Прибрати з кошика"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/85 backdrop-blur-md border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Разом</span>
              <span className="text-xl font-bold text-foreground">{convert(totalCents).formatted}</span>
            </div>
            <Button
              className="w-full min-h-[44px] bg-accent hover:bg-accent/90 text-white transition-transform duration-150 hover:-translate-y-px"
              disabled={paying}
              onClick={handleCheckout}
            >
              {paying ? "Оплата…" : "Оформити"}
            </Button>
          </div>
        </>
      )}
    </main>
  );
};
export default Cart;
