import { useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReviews } from "@/hooks/useReviews";

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

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const { error } = await createReview({ dealId, revieweeId, rating, text });
    setLoading(false);
    if (!error) onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="w-full max-w-lg bg-background rounded-t-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-foreground">Залишити відгук</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Про: <span className="font-medium text-foreground">{revieweeName}</span></p>

        <div className="flex gap-2 justify-center mb-4">
          {[1,2,3,4,5].map(star => (
            <button key={star} onClick={() => setRating(star)}>
              <Star className={`w-8 h-8 ${star <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>

        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Розкажіть про свій досвід співпраці..."
          rows={4} className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground placeholder:text-muted-foreground resize-none mb-4" />

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Скасувати</Button>
          <Button className="flex-1 bg-accent hover:bg-accent/90 text-white" disabled={!text.trim() || loading} onClick={submit}>
            {loading ? "Відправляємо..." : "Надіслати відгук"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
