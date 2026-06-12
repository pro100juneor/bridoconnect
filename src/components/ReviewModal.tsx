import { useState } from "react";
import { X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ReviewModalProps {
  isOpen?: boolean;
  onClose: () => void;
  dealId: string;
  revieweeId: string;
  revieweeName: string;
  // Reviewee's role in the deal — recipient оценивает sponsor'а как 'as_sponsor' и наоборот.
  // If omitted, defaults to 'as_recipient' (sponsor reviewing recipient — the common case).
  revieweeRole?: "as_sponsor" | "as_recipient";
  onSubmit?: () => void;
  onSuccess?: () => void;
}

const SPONSOR_TAGS = ["Швидко відповів", "Підтримуючий", "Зрозумілий", "Гнучкий"];
const RECIPIENT_TAGS = ["Надійний", "Чесний", "Швидко завершив", "Хороша комунікація"];

const ReviewModal = ({
  isOpen = true,
  onClose,
  dealId,
  revieweeId,
  revieweeName,
  revieweeRole = "as_recipient",
  onSubmit,
  onSuccess,
}: ReviewModalProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const availableTags = revieweeRole === "as_sponsor" ? SPONSOR_TAGS : RECIPIENT_TAGS;
  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

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
      toast({ title: "Помилка", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Відгук надіслано ✅",
        description: "Він стане видимим, коли друга сторона теж залишить відгук.",
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
          <h3 className="font-serif text-xl text-foreground">Залишити відгук</h3>
          <button onClick={onClose} aria-label="Закрити">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Оцініть співпрацю з <span className="font-semibold text-foreground">{revieweeName}</span>
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
              aria-label={`${star} stars`}
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
          {availableTags.map((t) => (
            <button
              key={t}
              data-testid={`tag-${t}`}
              onClick={() => toggleTag(t)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                tags.includes(t)
                  ? "bg-accent text-white border-accent"
                  : "border-border text-foreground hover:bg-secondary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Розкажіть про співпрацю (необов'язково)…"
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed">
          Mutual-blind: ваш відгук побачать тільки після того, як друга сторона теж залишить свій. Це
          попереджає взаємний шантаж.
        </p>

        <Button
          data-testid="review-submit"
          onClick={handleSubmit}
          disabled={rating === 0 || loading}
          className="w-full bg-accent hover:bg-accent/90 text-white h-12"
        >
          {loading ? "Надсилаємо…" : "Надіслати відгук"}
        </Button>
      </div>
    </div>
  );
};
export default ReviewModal;
