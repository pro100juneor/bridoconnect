import { useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReviews } from "@/hooks/useReviews";
import { toast } from "@/hooks/use-toast";

interface ReviewModalProps {
  dealId: string;
  revieweeId: string;
  revieweeName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ReviewModal = ({ dealId, revieweeId, revieweeName, onClose, onSuccess }: ReviewModalProps) => {
  const { createReview } = useReviews();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(0);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const { error } = await createReview({ dealId, revieweeId, rating, text });
    setLoading(false);
    if (!error) {
      toast({ title: "Відгук надіслано! ⭐", description: `Дякуємо за оцінку ${revieweeName}` });
      onSuccess();
    } else {
      toast({ title: "Помилка", description: "Не вдалось надіслати відгук", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-0">
      <div className="w-full max-w-screen-sm bg-background rounded-t-3xl p-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-foreground">Залишити відгук</h3>
          <button onClick={onClose} className="p-1"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Про: <span className="font-semibold text-foreground">{revieweeName}</span></p>

        <div className="flex gap-3 justify-center mb-5">
          {[1,2,3,4,5].map(star => (
            <button key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}>
              <Star className={`w-9 h-9 transition-colors ${star <= (hovered || rating) ? "fill-warning text-warning" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>

        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Розкажіть про свій досвід співпраці..."
          rows={4} className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground resize-none mb-4 focus:ring-2 focus:ring-accent/30" />

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Скасувати</Button>
          <Button className="flex-1 bg-accent hover:bg-accent/90 text-white" disabled={!text.trim() || loading} onClick={submit}>
            {loading ? "Відправляємо..." : "Надіслати ⭐"}
          </Button>
        </div>
      </div>
    </div>
  );
};
export default ReviewModal;
