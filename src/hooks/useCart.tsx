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
  /** Запам'ятовує позиції, з якими йдемо на Stripe Checkout (переживає редірект). */
  beginCheckout: (productIds: string[]) => void;
  /**
   * Викликається на success-сторінці після повернення зі Stripe: прибирає з
   * кошика саме оплачені позиції й повертає опис чекауту. null — якщо
   * очікуваного чекауту немає або він протух (на ?success=true зайшли просто так).
   */
  finishCheckout: () => PendingCheckout | null;
  totalCents: number; // base EUR minor units
  sellerId: string | null;
}

const LS_KEY = "brido-cart";
const LS_PENDING_KEY = "brido-cart-pending";
// Незавершений чекаут живе годину: пізніше це вже не «повернення з оплати».
const PENDING_TTL_MS = 60 * 60 * 1000;

export interface PendingCheckout {
  productIds: string[];
  /** epoch ms — момент переходу на Stripe; звужує пошук ордера в БД. */
  startedAt: number;
}

const readPending = (): PendingCheckout | null => {
  try {
    const raw = localStorage.getItem(LS_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckout;
    if (!Array.isArray(parsed.productIds) || typeof parsed.startedAt !== "number") return null;
    if (Date.now() - parsed.startedAt > PENDING_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

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

  const clear = useCallback(() => {
    setItems([]);
    localStorage.removeItem(LS_PENDING_KEY);
  }, []);

  const beginCheckout = useCallback((productIds: string[]) => {
    const pending: PendingCheckout = { productIds, startedAt: Date.now() };
    localStorage.setItem(LS_PENDING_KEY, JSON.stringify(pending));
  }, []);

  const finishCheckout = useCallback(() => {
    const pending = readPending();
    localStorage.removeItem(LS_PENDING_KEY);
    if (!pending || pending.productIds.length === 0) return null;
    // Прибираємо лише оплачене: якщо користувач встиг докласти щось в іншій
    // вкладці, воно має лишитись у кошику.
    const paid = new Set(pending.productIds);
    setItems((prev) => prev.filter((p) => !paid.has(p.productId)));
    return pending;
  }, []);

  const totalCents = items.reduce((s, i) => s + i.priceCents, 0);
  const sellerId = items[0]?.sellerId ?? null;

  return (
    <CartContext.Provider
      value={{ items, add, remove, clear, beginCheckout, finishCheckout, totalCents, sellerId }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
