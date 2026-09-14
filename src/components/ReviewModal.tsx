import { useState } from "react";
import { X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useT } from "@/i18n/useT";

interface ReviewModalProps {
  isOpen?: boolean;
  onClose: () => void;
  dealId: string;
  revieweeId: string;
  revieweeName: string;
  // Reviewee's role in the deal. Recipient оценивает sponsor'а как 'as_sponsor' и наоборот.
  // Audit P1: REQUIRED — silent default → wrong rating bucket = data corruption.
  revieweeRole: "as_sponsor" | "as_recipient";
  onSubmit?: () => void;
  onSuccess?: () => void;
}

const MAX_TAGS = 5;
const SPONSOR_TAGS = ["Швидко відповів", "Підтримуючий", "Зрозумілий", "Гнучкий"];
const RECIPIENT_TAGS = ["Надійний", "Чесний", "Швидко завершив", "Хороша комунікація"];

// Сами значения тегов уходят в БД (reviews.tags) и потому остаются украинскими —
// переводится только подпись на кнопке, ключ подбирается по значению.
const TAG_KEY: Record<string, string> = {
  "Швидко відповів": "review.tag.fastReply",
  "Підтримуючий": "review.tag.supportive",
  "Зрозумілий": "review.tag.clear",
  "Гнучкий": "review.tag.flexible",
  "Надійний": "review.tag.reliable",
  "Чесний": "review.tag.honest",
  "Швидко завершив": "review.tag.fastFinish",
  "Хороша комунікація": "review.tag.goodCommunication",
};

const ReviewModal = ({
  isOpen = true,
  onClose,
  dealId,
  revieweeId,
  revieweeName,
  revieweeRole,
  onSubmit,
  onSuccess,
}: ReviewModalProps) => {
  const { user } = useAuth();
  const { t } = useT();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const availableTags = revieweeRole === "as_sponsor" ? SPONSOR_TAGS : RECIPIENT_TAGS;
  // Параметр переименован из t — чтобы не затенять функцию перевода t() из useT().
  const toggleTag = (tag: string) =>
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((x) => x !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setLoading(true);

    // Trigger on_review_revealed will recompute rating_as_* — no manual update needed.
    const { error } = await supabase.from("reviews").insert({
      deal_id: dealId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      text: text.trim(),
      role: revieweeRole,
      tags,
    });

    if (error) {
      toast({
        title: t("review.error.title", "Помилка"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("review.success.title", "Відгук надіслано ✅"),
        description: t(
          "review.success.desc",
          "Він стане видимим, коли друга сторона теж залишить відгук."
        ),
      });
      onSubmit?.();
      onSuccess?.();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-t-3xl w-full max-w-md p-6 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-xl text-foreground">{t("review.title", "Залишити відгук")}</h3>
          <button onClick={onClose} aria-label={t("review.close", "Закрити")}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t("review.subject", "Оцініть співпрацю з")}{" "}
          <span className="font-semibold text-foreground">{revieweeName}</span>
        </p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              data-testid={`star-${star}`}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform active:scale-90"
              aria-label={t("review.rating.starsAria", `${star} stars`, { count: star })}
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= (hovered || rating) ? "fill-warning text-warning" : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {availableTags.map((tag) => (
            <button
              key={tag}
              data-testid={`tag-${tag}`}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                tags.includes(tag)
                  ? "bg-accent text-white border-accent"
                  : "border-border text-foreground hover:bg-secondary"
              }`}
            >
              {t(TAG_KEY[tag], tag)}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={t("review.textPlaceholder", "Розкажіть про співпрацю (необов'язково)…")}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed">
          {t(
            "review.mutualBlind",
            "Mutual-blind: ваш відгук побачать тільки після того, як друга сторона теж залишить свій."
          )}{" "}
          {t("review.antiBlackmail", "Це попереджає взаємний шантаж.")}
        </p>

        <Button
          data-testid="review-submit"
          onClick={handleSubmit}
          disabled={rating === 0 || loading}
          className="w-full bg-accent hover:bg-accent/90 text-white h-12"
        >
          {loading ? t("review.sending", "Надсилаємо…") : t("review.send", "Надіслати відгук")}
        </Button>
      </div>
    </div>
  );
};
export default ReviewModal;
