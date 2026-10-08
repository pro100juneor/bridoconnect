import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Loader2, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/i18n/useT";
import { toast } from "@/hooks/use-toast";
import { tap } from "@/lib/native";
import { uploadChatAttachment, signChatAttachment } from "@/lib/chatAttachments";

interface DealUpdateRow {
  id: string;
  text: string;
  image_path: string | null;
  created_at: string;
  signedUrl?: string | null;
}

/**
 * Прогресс-апдейты получателя по сделке (текст + опциональное фото/чек).
 * Прозрачность расходования — доказанный драйвер доверия и повторных донатов.
 * Постит только создатель сделки (RLS, миграция 055); видят обе стороны.
 */
export const DealUpdates = ({ dealId, canPost }: { dealId: string; canPost: boolean }) => {
  const { user } = useAuth();
  const { t, localeTag } = useT();
  const [updates, setUpdates] = useState<DealUpdateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const fetchUpdates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("deal_updates")
      .select("id, text, image_path, created_at")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as DealUpdateRow[];
    // Фото в приватном бакете — подписываем URL (как вложения чата).
    const withUrls = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        signedUrl: r.image_path ? await signChatAttachment(r.image_path) : null,
      }))
    );
    setUpdates(withUrls);
    setLoading(false);
  }, [dealId]);

  useEffect(() => {
    void fetchUpdates();
  }, [fetchUpdates]);

  const post = async () => {
    if (!user || !text.trim() || posting) return;
    void tap("light");
    setPosting(true);
    let imagePath: string | null = null;
    if (file) {
      const { path, error } = await uploadChatAttachment("deal", dealId, file);
      if (error || !path) {
        setPosting(false);
        toast({ title: t("chat.attachError", "Не вдалося завантажити файл"), variant: "destructive" });
        return;
      }
      imagePath = path;
    }
    const { error } = await supabase
      .from("deal_updates")
      .insert([{ deal_id: dealId, author_id: user.id, text: text.trim(), image_path: imagePath }]);
    setPosting(false);
    if (error) {
      toast({ title: t("dealUpdates.postError", "Не вдалося опублікувати"), variant: "destructive" });
      return;
    }
    setText("");
    setFile(null);
    void fetchUpdates();
  };

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
        {t("dealUpdates.title", "Оновлення")}
      </h3>

      {canPost && (
        <div className="bg-secondary rounded-2xl p-3 mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("dealUpdates.placeholder", "Розкажіть спонсору про прогрес…")}
            rows={2}
            className="w-full bg-background rounded-xl px-3 py-2 text-sm outline-none text-foreground resize-none focus:ring-2 focus:ring-accent/30"
          />
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer min-h-[44px]">
              <ImagePlus className="w-4 h-4" strokeWidth={1.75} />
              <span className="truncate max-w-[9rem]">
                {file ? file.name : t("dealUpdates.attach", "Фото / чек")}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              onClick={post}
              disabled={!text.trim() || posting}
              className="text-sm bg-accent text-white px-4 py-2 rounded-xl font-medium min-h-[44px] disabled:opacity-50 transition-transform duration-150 hover:-translate-y-px"
            >
              {posting ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                t("dealUpdates.post", "Опублікувати")
              )}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : updates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("dealUpdates.empty", "Поки що оновлень немає.")}
        </p>
      ) : (
        <div className="space-y-3">
          {updates.map((u) => (
            <div key={u.id} className="bg-secondary rounded-2xl p-3">
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{u.text}</p>
              {u.signedUrl && (
                <img
                  src={u.signedUrl}
                  alt={t("dealUpdates.photoAlt", "Фото оновлення")}
                  className="mt-2 rounded-xl max-h-60 w-full object-cover"
                  loading="lazy"
                />
              )}
              <p className="text-[11px] text-muted-foreground mt-2">
                {new Date(u.created_at).toLocaleDateString(localeTag, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealUpdates;
