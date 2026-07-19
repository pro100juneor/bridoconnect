import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Check, X, Ban, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useSponsorAccess,
  useSponsorReveal,
  type AccessGrant,
  type SponsorReveal,
} from "@/hooks/useSponsorAccess";
import { toast } from "@/hooks/use-toast";
import { tap, notify } from "@/lib/native";

const REVEAL_FIELDS: Array<{ key: keyof SponsorReveal; label: string; multiline?: boolean }> = [
  { key: "about", label: "Про себе", multiline: true },
  { key: "city", label: "Місто" },
  { key: "occupation", label: "Рід занять" },
  { key: "languages", label: "Мови" },
];

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  pending: { label: "Очікує рішення", tone: "text-warning" },
  granted: { label: "Доступ надано", tone: "text-success" },
  denied: { label: "Відхилено", tone: "text-destructive" },
  revoked: { label: "Відкликано", tone: "text-destructive" },
};

const SponsorPrivacy = () => {
  const navigate = useNavigate();
  const { reveal, loading: revealLoading, save } = useSponsorReveal();
  const { incomingRequests, decide } = useSponsorAccess();

  const [form, setForm] = useState<SponsorReveal>({});
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<AccessGrant[]>([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setForm(reveal);
  }, [reveal]);

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    const rows = await incomingRequests();
    setRequests(rows);
    setReqLoading(false);
  }, [incomingRequests]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleSave = async () => {
    void tap("medium");
    setSaving(true);
    // Keep only non-empty fields in the jsonb.
    const cleaned: SponsorReveal = {};
    for (const { key } of REVEAL_FIELDS) {
      const v = form[key]?.trim();
      if (v) cleaned[key] = v;
    }
    const { error } = await save(cleaned);
    setSaving(false);
    if (error) {
      toast({
        title: "Помилка",
        description: (error as any)?.message || "Не вдалося зберегти",
        variant: "destructive",
      });
      return;
    }
    void notify("success");
    toast({ title: "Збережено", description: "Анкету спонсора оновлено." });
  };

  const handleDecide = async (grantId: string, status: "granted" | "denied" | "revoked") => {
    void tap("light");
    setBusyId(grantId);
    const { error } = await decide(grantId, status);
    setBusyId(null);
    if (error) {
      toast({
        title: "Помилка",
        description: (error as any)?.message || "Не вдалося оновити",
        variant: "destructive",
      });
      return;
    }
    toast({
      title:
        status === "granted"
          ? "Доступ надано"
          : status === "denied"
            ? "Запит відхилено"
            : "Доступ відкликано",
    });
    await loadRequests();
  };

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
        <h2 className="font-serif text-lg text-foreground animate-fade-in">Приватність спонсора</h2>
      </div>

      <div className="px-4 space-y-6 mt-2">
        <div className="relative bg-secondary rounded-2xl p-4 flex items-start gap-3 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
          <Lock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.75} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ваша сторінка спонсора закрита за замовчуванням. Доступ надається окремо для кожного запиту —
            неможливо відкрити «всім назавжди».
          </p>
        </div>

        {/* Non-sensitive questionnaire — you choose what to reveal. */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Анкета (несекретна)
          </p>
          {revealLoading ? (
            <div className="h-40 bg-secondary animate-pulse rounded-2xl" />
          ) : (
            <div className="space-y-3">
              {REVEAL_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-xs text-muted-foreground block mb-1">{f.label}</label>
                  {f.multiline ? (
                    <textarea
                      value={form[f.key] || ""}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      rows={3}
                      className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[f.key] || ""}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30"
                    />
                  )}
                </div>
              ))}
              <Button
                className="w-full bg-accent hover:bg-accent/90 text-white transition-transform duration-150 hover:-translate-y-px"
                disabled={saving}
                onClick={handleSave}
              >
                Зберегти анкету
              </Button>
            </div>
          )}
        </div>

        {/* Incoming access requests — decided one by one. */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Запити на доступ
          </p>
          {reqLoading ? (
            <div className="h-24 bg-secondary animate-pulse rounded-2xl" />
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Inbox className="w-10 h-10 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Запитів немає</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const copy = STATUS_COPY[r.status] || STATUS_COPY.pending;
                const busy = busyId === r.id;
                return (
                  <div
                    key={r.id}
                    className="relative p-4 rounded-2xl border border-border overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary overflow-hidden shrink-0">
                        {r.requester?.avatar_url ? (
                          <img src={r.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (r.requester?.name || "?").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.requester?.name || "Користувач"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("uk", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          · контекст: {r.context}
                        </p>
                      </div>
                      <span className={`text-[10px] font-medium ${copy.tone}`}>{copy.label}</span>
                    </div>

                    {r.message && (
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3 whitespace-pre-wrap">
                        {r.message}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {(r.status === "pending" || r.status === "denied" || r.status === "revoked") && (
                        <Button
                          size="sm"
                          className="flex-1 bg-accent hover:bg-accent/90 text-white gap-1.5"
                          disabled={busy}
                          onClick={() => handleDecide(r.id, "granted")}
                        >
                          <Check className="w-4 h-4" strokeWidth={2} /> Надати доступ
                        </Button>
                      )}
                      {r.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5"
                          disabled={busy}
                          onClick={() => handleDecide(r.id, "denied")}
                        >
                          <X className="w-4 h-4" strokeWidth={2} /> Відхилити
                        </Button>
                      )}
                      {r.status === "granted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
                          disabled={busy}
                          onClick={() => handleDecide(r.id, "revoked")}
                        >
                          <Ban className="w-4 h-4" strokeWidth={2} /> Відкликати
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SponsorPrivacy;
