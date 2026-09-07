import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  RefreshCw,
  FileSearch,
  Users,
  Package,
  Radio,
  BarChart3,
  Megaphone,
  BadgeCheck,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@/integrations/supabase/types";

type SanctionsRow = {
  id: string;
  user_id: string | null;
  context: string;
  result: "clear" | "review" | "blocked";
  risk_score: number;
  checked_at: string;
};

type DisputeRow = {
  id: string;
  deal_id: string;
  opener_id: string;
  reason: string;
  status: string;
  created_at: string;
};

type RefundRow = {
  id: string;
  deal_id: string | null;
  amount: number;
  status: string;
  processor: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
  role: UserRole;
  verified: boolean;
  created_at: string;
};

type ProductRow = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  status: string;
  seller_id: string;
};

type StreamRow = {
  id: string;
  title: string;
  status: string;
  viewer_count: number;
  host_id: string;
};

type PromoRow = {
  id: string;
  headline: string | null;
  status: string;
  tier: string;
  expires_at: string | null;
};

type Stats = {
  users: number;
  products: number;
  streams: number;
  deals: number;
  orders: number;
};

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  const [sanctions, setSanctions] = useState<SanctionsRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [people, setPeople] = useState<ProfileRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === "admin";

  const count = useCallback(async (table: string) => {
    const { count: c } = await supabase
      .from(table as "profiles")
      .select("id", { count: "exact", head: true });
    return c ?? 0;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, d, r, p, pr, st, pm, ...counts] = await Promise.all([
      supabase
        .from("sanctions_screening_log")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(20),
      supabase
        .from("disputes")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("transactions")
        .select("id, deal_id, amount, status, processor, created_at")
        .eq("type", "refund")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("id, name, role, verified, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("products")
        .select("id, title, price_cents, currency, status, seller_id")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("streams")
        .select("id, title, status, viewer_count, host_id")
        .in("status", ["live", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("promotions")
        .select("id, headline, status, tier, expires_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20),
      count("profiles"),
      count("products"),
      count("streams"),
      count("deals"),
      count("orders"),
    ]);
    if (s.data) setSanctions(s.data as SanctionsRow[]);
    if (d.data) setDisputes(d.data as DisputeRow[]);
    if (r.data) setRefunds(r.data as RefundRow[]);
    if (p.data) setPeople(p.data as ProfileRow[]);
    if (pr.data) setProducts(pr.data as ProductRow[]);
    if (st.data) setStreams(st.data as StreamRow[]);
    if (pm.data) setPromos(pm.data as PromoRow[]);
    const [users, productsC, streamsC, dealsC, ordersC] = counts as number[];
    setStats({ users, products: productsC, streams: streamsC, deals: dealsC, orders: ordersC });
    setLoading(false);
  }, [count]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    load();
  }, [user, isAdmin, load]);

  const act = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await fn();
    if (error) toast({ title: "Помилка", description: error.message, variant: "destructive" });
    else {
      toast({ title: ok });
      load();
    }
  };

  const toggleVerified = (p: ProfileRow) =>
    act(
      () => supabase.from("profiles").update({ verified: !p.verified }).eq("id", p.id),
      p.verified ? "Верифікацію знято" : "Верифіковано"
    );

  const cycleRole = (p: ProfileRow) => {
    const next: UserRole = p.role === "sponsor" ? "recipient" : p.role === "recipient" ? "admin" : "sponsor";
    return act(() => supabase.from("profiles").update({ role: next }).eq("id", p.id), `Роль: ${next}`);
  };

  const toggleProduct = (pr: ProductRow) =>
    act(
      () =>
        supabase
          .from("products")
          .update({ status: pr.status === "active" ? "archived" : "active" })
          .eq("id", pr.id),
      pr.status === "active" ? "Товар приховано" : "Товар відновлено"
    );

  const endStream = (st: StreamRow) =>
    act(
      () =>
        supabase
          .from("streams")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", st.id),
      "Ефір завершено"
    );

  const stopPromo = (pm: PromoRow) =>
    act(() => supabase.from("promotions").update({ status: "expired" }).eq("id", pm.id), "Промо зупинено");

  if (profileLoading) {
    return (
      <div className="px-4 pt-4">
        <div className="h-32 rounded-2xl bg-secondary animate-pulse" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mb-3" strokeWidth={1.25} />
        <h2 className="font-serif text-xl text-foreground mb-2">Доступ обмежено</h2>
        <p className="text-sm text-muted-foreground mb-6">Тільки адміністратори.</p>
        <Button variant="outline" onClick={() => navigate("/app")}>
          На стрічку
        </Button>
      </main>
    );
  }

  const filteredPeople = search
    ? people.filter((p) => (p.name || "").toLowerCase().includes(search.toLowerCase()))
    : people.slice(0, 20);

  return (
    <main className="pb-8">
      <h1 className="sr-only">Admin dashboard</h1>
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1">Admin</h2>
        <button
          onClick={load}
          aria-label="Оновити"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
        </button>
      </div>

      <div className="px-4 py-4 space-y-6">
        <AdminSection title="Статистика" icon={BarChart3} loading={loading}>
          {stats && (
            <div className="grid grid-cols-5 gap-2 text-center">
              <Stat label="Люди" value={stats.users} />
              <Stat label="Товари" value={stats.products} />
              <Stat label="Ефіри" value={stats.streams} />
              <Stat label="Запити" value={stats.deals} />
              <Stat label="Замовл." value={stats.orders} />
            </div>
          )}
        </AdminSection>

        <AdminSection title="Користувачі" icon={Users} loading={loading}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за імʼям…"
            className="w-full mb-3 px-3 py-2 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {filteredPeople.length === 0 ? (
            <p className="text-xs text-muted-foreground">Нікого не знайдено.</p>
          ) : (
            filteredPeople.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 py-2 border-b border-border/40 last:border-0"
              >
                <span className="text-xs font-medium text-foreground truncate flex-1">
                  {p.name || p.id.slice(0, 8)}
                </span>
                <button
                  onClick={() => cycleRole(p)}
                  className={`text-[10px] px-2 py-1 rounded-full border ${p.role === "admin" ? "border-accent text-accent" : "border-border text-muted-foreground"}`}
                  title="Змінити роль"
                >
                  {p.role}
                </button>
                <button
                  onClick={() => toggleVerified(p)}
                  aria-label={p.verified ? "Зняти верифікацію" : "Верифікувати"}
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  <BadgeCheck
                    className={`w-4 h-4 ${p.verified ? "text-success" : "text-muted-foreground/40"}`}
                    strokeWidth={1.75}
                  />
                </button>
              </div>
            ))
          )}
        </AdminSection>

        <AdminSection title="Товари (модерація)" icon={Package} loading={loading}>
          {products.length === 0 ? (
            <p className="text-xs text-muted-foreground">Жодних товарів.</p>
          ) : (
            products.map((pr) => (
              <div
                key={pr.id}
                className="flex items-center gap-2 py-2 border-b border-border/40 last:border-0"
              >
                <span
                  className={`text-xs truncate flex-1 ${pr.status !== "active" ? "line-through text-muted-foreground" : "text-foreground"}`}
                >
                  {pr.title}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {(pr.price_cents / 100).toFixed(0)} {pr.currency?.toUpperCase()}
                </span>
                <button
                  onClick={() => toggleProduct(pr)}
                  aria-label={pr.status === "active" ? "Приховати" : "Відновити"}
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  <Ban
                    className={`w-4 h-4 ${pr.status === "active" ? "text-muted-foreground/50" : "text-destructive"}`}
                    strokeWidth={1.75}
                  />
                </button>
              </div>
            ))
          )}
        </AdminSection>

        <AdminSection title="Ефіри (live)" icon={Radio} loading={loading}>
          {streams.length === 0 ? (
            <p className="text-xs text-muted-foreground">Жодних активних ефірів.</p>
          ) : (
            streams.map((st) => (
              <div
                key={st.id}
                className="flex items-center gap-2 py-2 border-b border-border/40 last:border-0"
              >
                <ToneDot tone={st.status === "live" ? "destructive" : "warning"} />
                <span className="text-xs truncate flex-1 text-foreground">{st.title}</span>
                <span className="text-[10px] text-muted-foreground">{st.viewer_count} 👁</span>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => endStream(st)}>
                  Завершити
                </Button>
              </div>
            ))
          )}
        </AdminSection>

        <AdminSection title="Активні промо" icon={Megaphone} loading={loading}>
          {promos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Жодних активних промо.</p>
          ) : (
            promos.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center gap-2 py-2 border-b border-border/40 last:border-0"
              >
                <span className="text-xs truncate flex-1 text-foreground">
                  {pm.headline || pm.id.slice(0, 8)}
                </span>
                <span className="text-[10px] text-muted-foreground">{pm.tier}</span>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => stopPromo(pm)}>
                  Зупинити
                </Button>
              </div>
            ))
          )}
        </AdminSection>

        <AdminSection title="Sanctions Screening" icon={FileSearch} loading={loading}>
          {sanctions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Жодних перевірок.</p>
          ) : (
            sanctions.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
              >
                <ToneDot
                  tone={
                    s.result === "blocked" ? "destructive" : s.result === "review" ? "warning" : "success"
                  }
                />
                <span className="text-xs flex-1 truncate">
                  {s.user_id?.slice(0, 8) || "—"} · {s.context}
                </span>
                <span className="text-[10px] text-muted-foreground">{s.risk_score}</span>
                <span className="text-[10px] text-muted-foreground">{fmt(s.checked_at)}</span>
              </div>
            ))
          )}
        </AdminSection>

        <AdminSection title="Open Disputes" icon={AlertTriangle} loading={loading}>
          {disputes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Жодних відкритих спорів.</p>
          ) : (
            disputes.map((d) => (
              <div key={d.id} className="py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground truncate flex-1">
                    {d.deal_id.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{fmt(d.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{d.reason}</p>
              </div>
            ))
          )}
        </AdminSection>

        <AdminSection title="Recent Refunds" icon={RefreshCw} loading={loading}>
          {refunds.length === 0 ? (
            <p className="text-xs text-muted-foreground">Жодних refund'ів.</p>
          ) : (
            refunds.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
              >
                <span className="text-xs flex-1 truncate">{r.deal_id?.slice(0, 8) || "—"}</span>
                <span className="text-xs font-medium">€{r.amount}</span>
                <span className="text-[10px] text-muted-foreground">{r.processor}</span>
                <span className="text-[10px] text-muted-foreground">{r.status}</span>
              </div>
            ))
          )}
        </AdminSection>
      </div>
    </main>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="p-2 rounded-xl bg-secondary">
    <p className="text-base font-semibold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

const AdminSection = ({
  title,
  icon: Icon,
  loading,
  children,
}: {
  title: string;
  icon: typeof Shield;
  loading: boolean;
  children: React.ReactNode;
}) => (
  <section className="relative p-4 rounded-2xl border border-border overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
    <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
      <Icon className="w-4 h-4 text-accent" strokeWidth={1.75} /> {title}
    </h3>
    {loading ? <div className="h-16 rounded-xl bg-secondary animate-pulse" /> : children}
  </section>
);

const ToneDot = ({ tone }: { tone: "success" | "warning" | "destructive" }) => {
  const bg = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-destructive";
  return <span className={`w-2 h-2 rounded-full ${bg} shrink-0`} aria-hidden="true" />;
};

const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("uk", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
};

export default Admin;
