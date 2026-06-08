import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Transaction } from "@/integrations/supabase/types";

export const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const txs = (data || []) as unknown as Transaction[];
    setTransactions(txs);
    const bal = txs.reduce((sum, tx) => {
      if (tx.type === "deposit" || tx.type === "refund") return sum + tx.amount;
      return sum - tx.amount;
    }, 0);
    setBalance(bal);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, balance, loading, refetch: fetchTransactions };
};
