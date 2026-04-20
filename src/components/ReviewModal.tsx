import { useState } from "react";
import { X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  revieweeId: string;
  revieweeName: string;
  onSubmit?: () => void;
}

const ReviewModal = ({ isOpen, onClose, dealId, revieweeId, revieweeName, onSubmit }: ReviewModalProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setLoading(true);

    const { error } = await supabase.from("reviews").insert({
      deal_id: dealId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      text: text.trim(),
    });

    if (error) {
      toast({ title: "Помилка", description: error.message, variant: "destructive" });
    } else {
      // Оновлюємо рейтинг профілю
      const { data: reviews } = await supabase
        .from("reviews").select("rating").eq("reviewee_id", revieweeId);
      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
        await supabase.from("profiles").update({ rating: Math.round(avg * 100) / 100 }).eq("id", revieweeId);
      }
      toast({ title: "Відгук надіслано ✅" });
      onSubmit?.();
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
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">Оцініть вашу співпрацю з <span className="font-semibold text-foreground">{revieweeName}</span></p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform active:scale-90">
              <Star className={`w-10 h-10 transition-colors ${
                star <= (hovered || rating) ? "fill-warning text-warning" : "text-muted-foreground/30"
              }`} />
            </button>
          ))}
        </div>

        <div className="mb-6">
          <textarea value={text} onChange={(e) => setText(e.target.value)}
            rows={3} placeholder="Розкажіть про вашу співпрацю (необов'язково)..."
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-accent/30" />
        </div>

        <Button onClick={handleSubmit} disabled={rating === 0 || loading}
          className="w-full bg-accent hover:bg-accent/90 text-white h-12">
          {loading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            : null}
          {loading ? "Надсилаємо..." : "Надіслати відгук"}
        </Button>
      </div>
    </div>
  );
};
export default ReviewModal;
