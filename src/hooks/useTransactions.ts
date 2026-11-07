import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Transaction } from "@/integrations/supabase/types";

export const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  // Чистый фетч без setState — чтобы вызывающий (эффект под alive-guard или
  // ручной refetch) сам решал, применять ли результат.
  const load = useCallback(async (): Promise<{ txs: Transaction[]; bal: number }> => {
    if (!user) return { txs: [], bal: 0 };
    // Список — последние 50 для показа; баланс — по ВСЕМУ леджеру (иначе при
    // >50 транзакциях баланс считался бы только по последней странице и был неверен).
    const [listRes, ledgerRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("transactions").select("type, amount").eq("user_id", user.id),
    ]);
    const txs = (listRes.data || []) as unknown as Transaction[];
    const ledger = (ledgerRes.data || []) as unknown as Pick<Transaction, "type" | "amount">[];
    const bal = ledger.reduce((sum, tx) => {
      if (tx.type === "deposit" || tx.type === "refund") return sum + tx.amount;
      return sum - tx.amount;
    }, 0);
    return { txs, bal };
  }, [user]);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { txs, bal } = await load();
    setTransactions(txs);
    setBalance(bal);
    setLoading(false);
  }, [load]);

  useEffect(() => {
    let alive = true;
    if (!user) {
      // Смена аккаунта / выход: не оставляем баланс и историю прежнего юзера.
      setTransactions([]);
      setBalance(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    void load().then(({ txs, bal }) => {
      if (!alive) return;
      setTransactions(txs);
      setBalance(bal);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user, load]);

  return { transactions, balance, loading, refetch };
};
