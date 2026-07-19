import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Lock, ShieldCheck, Send, Edit2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSponsorAccess,
  type SponsorProfile,
  type AccessGrant,
  type SponsorReveal,
} from "@/hooks/useSponsorAccess";
import { toast } from "@/hooks/use-toast";
import { tap, notify } from "@/lib/native";

// Human-readable labels for the revealed questionnaire fields.
const REVEAL_LABELS: Record<string, string> = {
  about: "Про себе",
  city: "Місто",
  occupation: "Рід занять",
  languages: "Мови",
};

const RevealFields = ({ reveal }: { reveal: SponsorReveal }) => {
  const entries = Object.entries(reveal).filter(([, v]) => v && String(v).trim());
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Власник ще не додав інформацію.</p>;
  }
  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="relative bg-secondary rounded-2xl px-4 py-3 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
        >
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
            {REVEAL_LABELS[key] || key}
          </span>
          <span className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{value}</span>
        </div>
      ))}
    </div>
  );
};

const SponsorPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const context = searchParams.get("context") || "general";
  const { user } = useAuth();
  const { getSponsorProfile, requestAccess, outgoingRequests } = useSponsorAccess();

  const [sponsor, setSponsor] = useState<SponsorProfile | null>(null);
  const [grant, setGrant] = useState<AccessGrant | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const isOwner = !!user && user.id === id;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const prof = await getSponsorProfile(id);
    setSponsor(prof);
    if (user && user.id !== id) {
      const outgoing = await outgoingRequests();
      setGrant(outgoing.find((g) => g.owner_id === id && g.context === context) || null);
    }
    setLoading(false);
  }, [id, user, context, getSponsorProfile, outgoingRequests]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRequest = async () => {
    if (!id) return;
    void tap("medium");
    setSending(true);
    const { error } = await requestAccess(id, context, message);
    setSending(false);
    if (error) {
      toast({
        title: "Помилка",
        description: (error as any)?.message || "Не вдалося надіслати запит",
        variant: "destructive",
      });
      return;
    }
    void notify("success");
    toast({ title: "Запит надіслано", description: "Очікує згоди власника." });
    setMessage("");
    await load();
  };

  const initials = sponsor?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary animate-pulse" />
          <div className="h-6 w-32 bg-secondary animate-pulse rounded" />
        </div>
        <div className="flex flex-col items-center py-6 gap-3">
          <div className="w-20 h-20 rounded-full bg-secondary animate-pulse" />
          <div className="h-5 w-40 bg-secondary animate-pulse rounded" />
        </div>
        <div className="h-24 bg-secondary animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!sponsor) {
    return (
      <div className="text-center py-16 px-6">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="inline-flex items-center gap-2 text-muted-foreground mb-6 text-sm min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Назад
        </button>
        <p className="text-muted-foreground">Профіль не знайдено</p>
      </div>
    );
  }

  const canView = isOwner || sponsor.canView;

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-lg text-foreground animate-fade-in">Сторінка спонсора</h2>
      </div>

      <div className="px-4 py-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary mx-auto mb-3 overflow-hidden">
          {sponsor.avatar_url ? (
            <img src={sponsor.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            initials || "?"
          )}
        </div>
        <h3 className="font-semibold text-lg text-foreground">{sponsor.name || "Спонсор"}</h3>
        {!canView && (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <Lock className="w-3.5 h-3.5" strokeWidth={1.75} /> Закритий профіль
          </p>
        )}
      </div>

      {/* Owner: full view of own questionnaire + edit shortcut. */}
      {isOwner && (
        <div className="px-4 space-y-4">
          <div className="relative bg-accent/5 border border-accent/20 rounded-2xl p-4">
            <p className="text-sm text-foreground font-medium mb-1">Це ваша сторінка спонсора</p>
            <p className="text-xs text-muted-foreground">
              За замовчуванням вона закрита. Доступ надається лише за вашою згодою під конкретний запит.
            </p>
          </div>
          <RevealFields reveal={sponsor.reveal} />
          <Button
            className="w-full bg-accent hover:bg-accent/90 text-white gap-2 transition-transform duration-150 hover:-translate-y-px"
            onClick={() => {
              void tap("light");
              navigate("/app/sponsor-privacy");
            }}
          >
            <Edit2 className="w-4 h-4" strokeWidth={1.75} /> Редагувати анкету
          </Button>
        </div>
      )}

      {/* Viewer with granted access: revealed fields. */}
      {!isOwner && canView && (
        <div className="px-4 space-y-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-success">
            <ShieldCheck className="w-4 h-4" strokeWidth={1.75} /> Доступ надано власником
          </p>
          <RevealFields reveal={sponsor.reveal} />
        </div>
      )}

      {/* Viewer without access: closed state + per-request access form. */}
      {!isOwner && !canView && (
        <div className="px-4 space-y-4">
          <div className="relative bg-secondary rounded-2xl p-5 text-center overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground mb-1">Профіль закритий</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Доступ надається лише за згодою власника під конкретний запит.
            </p>
          </div>

          {grant?.status === "pending" && (
            <div className="relative bg-warning/5 border border-warning/20 rounded-2xl p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-warning shrink-0" strokeWidth={1.75} />
              <p className="text-xs text-foreground">Запит надіслано, очікує згоди власника.</p>
            </div>
          )}

          {grant?.status === "denied" && (
            <div className="relative bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
              <p className="text-xs text-destructive">Власник відхилив ваш запит на доступ.</p>
            </div>
          )}

          {grant?.status === "revoked" && (
            <div className="relative bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
              <p className="text-xs text-destructive">Доступ було відкликано власником.</p>
            </div>
          )}

          {(!grant || grant.status === "denied" || grant.status === "revoked") && (
            <div className="space-y-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Повідомлення власнику (навіщо потрібен доступ)"
                className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Контекст запиту: <span className="text-foreground">{context}</span>
              </p>
              <Button
                className="w-full bg-accent hover:bg-accent/90 text-white gap-2 transition-transform duration-150 hover:-translate-y-px"
                disabled={sending}
                onClick={handleRequest}
              >
                <Send className="w-4 h-4" strokeWidth={1.75} /> Запросити доступ
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SponsorPage;
