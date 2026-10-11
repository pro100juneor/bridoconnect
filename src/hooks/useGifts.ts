import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FulfillmentStatus = "pending" | "accepted" | "shipped" | "delivered" | "canceled";

export interface Gift {
  id: string;
  status: string;
  fulfillment_status: FulfillmentStatus;
  tracking: string | null;
  created_at: string;
  amount_cents: number;
  product_title: string;
  product_image: string | null;
  seller_name: string;
  beneficiary_name: string;
}

interface JoinName {
  name: string | null;
}
interface ProductJoin {
  title: string | null;
  images: string[] | null;
}
interface GiftRow {
  id: string;
  status: string;
  fulfillment_status: FulfillmentStatus;
  tracking: string | null;
  created_at: string;
  amount_cents: number;
  products: ProductJoin | null;
  seller: JoinName | null;
  beneficiary: JoinName | null;
}

const SELECT = `
  id, status, fulfillment_status, tracking, created_at, amount_cents,
  products!product_id(title, images),
  seller:profiles!seller_id(name),
  beneficiary:profiles!beneficiary_id(name)
`;

// Подарки: получатель видит полученные (beneficiary_id=me), спонсор — отправленные
// (buyer_id=me и is_gift). RLS orders_select уже допускает обе роли; адрес сюда не
// попадает (его отдаёт только RPC мерчанту).
export const useGifts = (mode: "received" | "sent") => {
  const { user } = useAuth();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setGifts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    let query = supabase.from("orders").select(SELECT).order("created_at", { ascending: false });
    query =
      mode === "received"
        ? query.eq("beneficiary_id", user.id)
        : query.eq("buyer_id", user.id).eq("is_gift", true);
    const { data, error: err } = await query;
    if (err) {
      setError(true);
      setGifts([]);
    } else {
      setGifts(
        ((data as unknown as GiftRow[] | null) ?? []).map((r) => ({
          id: r.id,
          status: r.status,
          fulfillment_status: r.fulfillment_status,
          tracking: r.tracking,
          created_at: r.created_at,
          amount_cents: r.amount_cents,
          product_title: r.products?.title || "—",
          product_image: r.products?.images?.[0] ?? null,
          seller_name: r.seller?.name || "—",
          beneficiary_name: r.beneficiary?.name || "—",
        }))
      );
    }
    setLoading(false);
  }, [user, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  return { gifts, loading, error, reload: load };
};
