import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Clock, ChevronRight, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useT } from "@/i18n/useT";
import { useCurrency } from "@/hooks/useCurrency";
import { convertAmount } from "@/lib/money";
import { tap } from "@/lib/native";
import type { Deal, Profile } from "@/integrations/supabase/types";

interface DealListItem extends Deal {
  creator_name?: string;
  creator_flag?: string;
  profiles?: Pick<Profile, "name" | "verified" | "rating"> | null;
}

// Подпись берётся из словаря на каждом рендере — иначе статусы остались бы
// украинскими после переключения языка (константа вычисляется один раз).
const statusMap: Record<string, { icon: LucideIcon; key: string; fallback: string; color: string }> = {
  completed: { icon: CheckCircle, key: "deals.status.completed", fallback: "Завершено", color: "text-success bg-success/10" },
  active: { icon: Clock, key: "deals.status.active", fallback: "Активна", color: "text-warning bg-warning/10" },
  pending: { icon: Clock, key: "deals.status.pending", fallback: "Очікує", color: "text-warning bg-warning/10" },
  cancelled: { icon: XCircle, key: "deals.status.cancelled", fallback: "Скасовано", color: "text-destructive bg-destructive/10" },
  disputed: { icon: XCircle, key: "deals.status.disputed", fallback: "Спір", color: "text-destructive bg-destructive/10" },
};

const DealHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, localeTag } = useT();
  const { money, rates } = useCurrency();
  const [deals, setDeals] = useState<DealListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("deals")
      .select("*, profiles!creator_id(name, verified, rating)")
      .or(`creator_id.eq.${user.id},sponsor_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setDeals(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const list = deals;
  // Суммировать amount по угодам «как есть» нельзя: у каждой своя deals.currency.
  // Нормализуем в EUR по живому курсу; угоды с неизвестным курсом в сумму не
  // попадают (лучше недосчитать, чем показать смесь валют одним числом).
  const totalEur = list
    .filter((d) => d.status === "completed")
    .reduce((sum, d) => sum + (convertAmount(d.amount || 0, d.currency, "eur", rates) ?? 0), 0);
  const completed = list.filter((d) => d.status === "completed").length;

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-4">
        <h1 className="font-serif text-4xl tracking-tight text-foreground mb-4 animate-fade-in">
          {t("deals.history.title", "Історія угод")}
        </h1>
        {/* DESIGN.md §Anti-patterns: break symmetric 3-col — "Надано" hero anchor on top, then 2-col */}
        <div className="space-y-3">
          <div className="relative bg-secondary rounded-2xl p-4 text-center overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
            <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">
              {t("deals.history.provided", "Надано")}
            </span>
            <span className="font-serif text-3xl tracking-tight text-foreground">
              {money(totalEur, "eur").formatted}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative bg-secondary rounded-2xl p-3 text-center overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
              <p className="text-lg font-bold text-foreground">{list.length}</p>
              <p className="text-xs text-muted-foreground">{t("deals.history.total", "Всього")}</p>
            </div>
            <div className="relative bg-secondary rounded-2xl p-3 text-center overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
              <p className="text-lg font-bold text-success">{completed}</p>
              <p className="text-xs text-muted-foreground">{t("deals.status.completed", "Завершено")}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        // DESIGN.md §Loading: 4 skeleton rows
        <div className="px-4 mt-4 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="px-6 py-16 flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
            <svg
              viewBox="0 0 48 48"
              className="w-10 h-10 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="8" y="8" width="32" height="32" rx="4" />
              <path d="M16 18h16M16 24h16M16 30h12" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("deals.history.empty", "Поки що немає угод.")}
            <br />
            {t("deals.history.emptyHint", "Знайдіть запит на стрічці.")}
          </p>
        </div>
      ) : (
        <PullToRefresh onRefresh={refetch}>
          <div className="px-4 mt-4 space-y-2">
            {list.map((deal) => {
              const s = statusMap[deal.status] || statusMap.pending;
              const name = deal.creator_name || deal.profiles?.name || t("common.user", "Користувач");
              return (
                <button
                  key={deal.id}
                  onClick={() => {
                    void tap("light");
                    navigate(`/app/deal/${deal.id}`);
                  }}
                  className="w-full relative flex items-center gap-3 p-4 rounded-2xl border border-border hover:bg-secondary/50 hover:-translate-y-px transition-all duration-150 text-left overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {name} {deal.creator_flag || "🏳️"}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${s.color}`}>
                        {t(s.key, s.fallback)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {deal.title || t("deals.item.fallbackTitle", "Угода")} ·{" "}
                      {new Date(deal.created_at).toLocaleDateString(localeTag)}
                    </p>
                  </div>
                  <div className="text-right">
                    {/* Сумма угоды заявлена в deal.currency — показываем её честно,
                        конвертируя в валюту отображения по курсу из currency_rates. */}
                    <p className="font-bold text-sm text-foreground">
                      {money(deal.amount || 0, deal.currency).formatted}
                    </p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" strokeWidth={1.75} />
                  </div>
                </button>
              );
            })}
          </div>
        </PullToRefresh>
      )}
    </div>
  );
};
export default DealHistory;
