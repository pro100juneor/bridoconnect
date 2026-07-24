import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import type { PromotedProfile } from "@/hooks/usePromotions";

// Route to the promoted profile. The promoted user's role is the OPPOSITE of the
// audience (a recipient is promoted TO sponsors, and vice-versa):
//   audience 'sponsor'   -> promoted is a recipient -> /u/:slug (fallback /app/user/:id)
//   audience 'recipient' -> promoted is a sponsor   -> /app/sponsor/:id
export function promoHref(p: PromotedProfile): string {
  if (p.audience === "sponsor") {
    return p.slug ? `/u/${p.slug}` : `/app/user/${p.user_id}`;
  }
  return `/app/sponsor/${p.user_id}`;
}

const ROTATE_MS = 6000;

// prefers-reduced-motion: don't auto-rotate; show the first slide only.
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

interface PromoCarouselProps {
  items: PromotedProfile[];
}

/**
 * Header carousel for the paid promo feed. Auto-rotates the promoted "faces"
 * (photo_url ?? avatar) every ~6s. Clicking a slide opens that profile.
 *
 * NOTE on the ">=3 minutes on screen" guarantee: the ORDER of `items` already
 * comes ranked from the DB (active_promotions RPC + min_visible_until keeps a
 * freshly-paid placement in the top group for at least 3 minutes). This carousel
 * only cycles through them visually — it must NOT reorder items on a client
 * timer, or it would break that server-side guarantee.
 */
export default function PromoCarousel({ items }: PromoCarouselProps) {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const count = items.length;

  // Keep the active index valid if the list shrinks between renders.
  const active = count > 0 ? index % count : 0;

  // Auto-rotation timer. Cleared on unmount / when deps change. Disabled when
  // reduced-motion is requested or there is only a single slide.
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (reduced || count <= 1) return;
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, ROTATE_MS);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [reduced, count]);

  const current = useMemo(() => items[active], [items, active]);
  if (count === 0 || !current) return null;

  const img = current.photo_url ?? current.avatar_url ?? null;
  const initials = (current.name || "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="px-4 mb-4">
      <div
        onClick={() => navigate(promoHref(current))}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") navigate(promoHref(current));
        }}
        aria-label={`Промо: ${current.name}`}
        className="relative h-[200px] rounded-2xl overflow-hidden cursor-pointer border border-border bg-primary/5 transition-all duration-200 hover:-translate-y-px active:scale-[0.99] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:z-20"
      >
        {img ? (
          <img
            src={img}
            alt={current.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center text-2xl font-bold text-primary">
              {initials}
            </div>
          </div>
        )}

        {/* Bottom gradient scrim for legible text over the photo. */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/25 to-transparent z-10" />

        <span className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          Промо
        </span>

        <div className="absolute inset-x-0 bottom-0 z-20 p-4">
          <p className="text-white font-semibold text-base drop-shadow-sm truncate">
            {current.name}
            {current.city ? <span className="font-normal text-white/80"> · {current.city}</span> : null}
          </p>
          {current.headline ? <p className="text-white/90 text-sm truncate">{current.headline}</p> : null}
        </div>
      </div>

      {/* Dot indicators — click to jump to a slide. */}
      {count > 1 && (
        <div className="flex justify-center gap-1.5 mt-2" role="tablist" aria-label="Промо-слайди">
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => setIndex(i)}
              role="tab"
              aria-selected={i === active}
              aria-label={`Слайд ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-4 bg-accent" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
