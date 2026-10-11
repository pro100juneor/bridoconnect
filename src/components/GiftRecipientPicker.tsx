import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, Gift, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "@/hooks/use-toast";
import { tap } from "@/lib/native";
import { useT } from "@/i18n/useT";

interface Candidate {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  avatar?: string | null;
}

interface ProfileRow {
  id: string;
  name: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
}

// Выбор бенефициара подарка. Источник — избранные получатели спонсора + поиск по
// получателям. Адрес НЕ показывается (приватность): проверяется только его наличие
// через recipient_has_shipping_address перед стартом чекаута.
export function GiftRecipientPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (id: string, name: string) => void;
}) {
  const { t } = useT();
  const { favorites } = useFavorites();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    const term = query.replace(/[,()%_]/g, " ").trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    const h = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, city, country, avatar_url")
        .eq("role", "recipient")
        .ilike("name", `%${term}%`)
        .limit(20);
      if (!alive) return;
      setResults(
        ((data as ProfileRow[] | null) ?? []).map((p) => ({
          id: p.id,
          name: p.name || t("gift.recipientFallback", "Отримувач"),
          city: p.city,
          country: p.country,
          avatar: p.avatar_url,
        }))
      );
    }, 300);
    return () => {
      alive = false;
      clearTimeout(h);
    };
  }, [query, t]);

  const favCandidates: Candidate[] = useMemo(
    () =>
      favorites.map((f) => ({
        id: f.target_id,
        name: f.target_name || t("gift.recipientFallback", "Отримувач"),
        city: f.target_city,
        country: f.target_country,
        avatar: f.target_avatar,
      })),
    [favorites, t]
  );

  const list = query.trim().length >= 2 ? results : favCandidates;

  const pick = async (c: Candidate) => {
    if (checking) return;
    setChecking(c.id);
    const { data, error } = await supabase.rpc("recipient_has_shipping_address", { p_user: c.id });
    setChecking(null);
    if (error) {
      toast({ title: t("gift.checkFailed", "Не вдалося перевірити адресу"), variant: "destructive" });
      return;
    }
    if (!data) {
      toast({
        title: t("gift.noAddressTitle", "У отримувача немає адреси"),
        description: t(
          "gift.noAddressDesc",
          "Отримувач ще не додав адресу доставки — подарунок поки не відправити."
        ),
        variant: "destructive",
      });
      return;
    }
    void tap("medium");
    onSelect(c.id, c.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-accent" strokeWidth={1.75} />{" "}
            {t("gift.pickTitle", "Кому подарувати")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 bg-secondary rounded-2xl px-3 py-2 min-h-[44px] focus-within:ring-2 focus-within:ring-accent/30">
          <SearchIcon className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("gift.searchPh", "Ім'я отримувача…")}
            aria-label={t("gift.searchPh", "Ім'я отримувача…")}
            className="bg-transparent text-sm flex-1 outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {query.trim().length >= 2
                ? t("gift.noResults", "Нічого не знайдено")
                : t("gift.favHint", "Знайдіть отримувача за іменем або додайте до обраних")}
            </p>
          ) : (
            <div className="space-y-2">
              {list.map((c) => {
                const initials = (c.name || "??").slice(0, 2);
                return (
                  <button
                    key={c.id}
                    onClick={() => void pick(c)}
                    disabled={checking === c.id}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-secondary/60 transition-colors text-left disabled:opacity-60"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0 overflow-hidden">
                      {c.avatar ? (
                        <img src={c.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      {(c.city || c.country) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[c.city, c.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
