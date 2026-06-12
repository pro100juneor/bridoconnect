import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, RefreshCw, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

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

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [sanctions, setSanctions] = useState<SanctionsRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!user || !isAdmin) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("sanctions_screening_log")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(50),
      supabase
        .from("disputes")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("transactions")
        .select("id, deal_id, amount, status, processor, created_at")
        .eq("type", "refund")
        .order("created_at", { ascending: false })
        .limit(50),
    ]).then(([s, d, r]) => {
      if (s.data) setSanctions(s.data as SanctionsRow[]);
      if (d.data) setDisputes(d.data as DisputeRow[]);
      if (r.data) setRefunds(r.data as RefundRow[]);
      setLoading(false);
    });
  }, [user, isAdmin]);

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
      </div>

      <div className="px-4 py-4 space-y-6">
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
