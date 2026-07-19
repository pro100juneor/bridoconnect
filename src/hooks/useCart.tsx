import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "@/hooks/use-toast";

export interface CartItem {
  productId: string;
  sellerId: string;
  title: string;
  priceCents: number; // base EUR minor units
  image?: string;
}

interface CartCtx {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (productId: string) => void;
  clear: () => void;
  totalCents: number; // base EUR minor units
  sellerId: string | null;
}

const LS_KEY = "brido-cart";
const CartContext = createContext<CartCtx | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  // A cart is a single Stripe Connect destination charge → one seller only.
  // Each position is one physical unit → no duplicates / quantities.
  const add = useCallback(
    (item: CartItem) => {
      if (items.some((p) => p.productId === item.productId)) return;
      if (items.length > 0 && items[0].sellerId !== item.sellerId) {
        toast({ title: "В кошику товари лише одного продавця", variant: "destructive" });
        return;
      }
      setItems((prev) => [...prev, item]);
    },
    [items]
  );

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalCents = items.reduce((s, i) => s + i.priceCents, 0);
  const sellerId = items[0]?.sellerId ?? null;

  return (
    <CartContext.Provider value={{ items, add, remove, clear, totalCents, sellerId }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
