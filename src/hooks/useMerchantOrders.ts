import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FulfillmentStatus } from "@/hooks/useGifts";

export interface MerchantOrder {
  id: string;
  status: string;
  fulfillment_status: FulfillmentStatus;
  tracking: string | null;
  created_at: string;
  amount_cents: number;
  is_gift: boolean;
  product_title: string;
  product_image: string | null;
  buyer_name: string;
  beneficiary_name: string | null;
}

export interface OrderShipping {
  full_name: string;
  phone: string | null;
  country: string;
  city: string;
  street: string;
  postal_code: string | null;
  notes: string | null;
}

interface JoinName {
  name: string | null;
}
interface ProductJoin {
  title: string | null;
  images: string[] | null;
}
interface OrderRow {
  id: string;
  status: string;
  fulfillment_status: FulfillmentStatus;
  tracking: string | null;
  created_at: string;
  amount_cents: number;
  is_gift: boolean;
  products: ProductJoin | null;
  buyer: JoinName | null;
  beneficiary: JoinName | null;
}

const SELECT = `
  id, status, fulfillment_status, tracking, created_at, amount_cents, is_gift,
  products!product_id(title, images),
  buyer:profiles!buyer_id(name),
  beneficiary:profiles!beneficiary_id(name)
`;

// Кабинет заказов мерчанта: заказы, где он продавец. Адрес доставки получателя
// НЕ в выборке — его отдаёт только RPC order_shipping_for_merchant по оплаченному
// заказу. Статус исполнения меняется через RPC merchant_update_fulfillment.
export const useMerchantOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("orders")
      .select(SELECT)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    if (err) {
      setError(true);
      setOrders([]);
    } else {
      setOrders(
        ((data as unknown as OrderRow[] | null) ?? []).map((r) => ({
          id: r.id,
          status: r.status,
          fulfillment_status: r.fulfillment_status,
          tracking: r.tracking,
          created_at: r.created_at,
          amount_cents: r.amount_cents,
          is_gift: r.is_gift,
          product_title: r.products?.title || "—",
          product_image: r.products?.images?.[0] ?? null,
          buyer_name: r.buyer?.name || "—",
          beneficiary_name: r.beneficiary?.name ?? null,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const getShipping = async (orderId: string): Promise<OrderShipping | null> => {
    const { data, error: err } = await supabase.rpc("order_shipping_for_merchant", { p_order_id: orderId });
    if (err || !data) return null;
    const rows = data as OrderShipping[];
    return rows.length > 0 ? rows[0] : null;
  };

  const updateFulfillment = async (
    orderId: string,
    status: FulfillmentStatus,
    tracking?: string
  ): Promise<{ error?: string }> => {
    const { error: err } = await supabase.rpc("merchant_update_fulfillment", {
      p_order_id: orderId,
      p_status: status,
      p_tracking: tracking ?? null,
    });
    if (err) return { error: err.message };
    await load();
    return {};
  };

  return { orders, loading, error, reload: load, getShipping, updateFulfillment };
};
