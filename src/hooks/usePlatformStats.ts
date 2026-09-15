import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Реальные агрегаты платформы для страницы «Прозорість».
 *
 * Раньше цифры на той странице были захардкожены (€847,240, 3,847 угод,
 * 12,340 користувачів) — при том, что заголовок обещал «реальні дані».
 * Теперь единственный источник — RPC `public_platform_stats` (миграция 041),
 * которая считает по deals/orders/reviews и не отдаёт ничего персонального.
 *
 * `null` в поле значит «данных ещё нет» — вызывающий код обязан это показать
 * честно, а не подставлять красивое число.
 */
export interface PlatformStats {
  volume_cents: number;
  deals_completed: number;
  orders_completed: number;
  active_users: number;
  countries: number;
  avg_rating: number | null;
  reviews_count: number;
  since: string | null;
  generated_at: string;
}

export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data, error } = await supabase.rpc("public_platform_stats");
      if (!alive) return;
      if (error || !data) {
        // Не подставляем заглушку: страница просто не покажет цифры.
        setFailed(true);
      } else {
        setStats(data as unknown as PlatformStats);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { stats, loading, failed };
}
