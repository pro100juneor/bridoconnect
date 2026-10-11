import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ShippingAddress {
  id: string;
  full_name: string;
  phone: string | null;
  country: string;
  city: string;
  street: string;
  postal_code: string | null;
  notes: string | null;
  created_at: string;
}

export interface AddressInput {
  full_name: string;
  phone?: string;
  country: string;
  city: string;
  street: string;
  postal_code?: string;
  notes?: string;
}

// Адреса доставки получателя. RLS отдаёт только собственные строки владельца;
// мерчант видит адрес исключительно через order_shipping_for_merchant() по заказу.
export const useShippingAddresses = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("shipping_addresses")
      .select("id, full_name, phone, country, city, street, postal_code, notes, created_at")
      .order("created_at", { ascending: false });
    if (err) {
      setError(true);
      setAddresses([]);
    } else {
      setAddresses((data ?? []) as ShippingAddress[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const addAddress = async (input: AddressInput): Promise<{ error?: string }> => {
    if (!user) return { error: "Not authenticated" };
    const { error: err } = await supabase.from("shipping_addresses").insert({ user_id: user.id, ...input });
    if (err) return { error: err.message };
    await load();
    return {};
  };

  const removeAddress = async (id: string): Promise<{ error?: string }> => {
    const { error: err } = await supabase.from("shipping_addresses").delete().eq("id", id);
    if (err) return { error: err.message };
    await load();
    return {};
  };

  return { addresses, loading, error, addAddress, removeAddress, reload: load };
};
