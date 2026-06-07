// M6 — iOS-style pull-to-refresh. Detects touchstart at scrollTop=0, tracks
// downward pull, shows a spring-loaded chevron, fires onRefresh when released
// past the threshold. No-ops on desktop / when reduce-motion is set.
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, ArrowDown } from "lucide-react";

type Props = {
  onRefresh: () => Promise<unknown> | void;
  threshold?: number;
  children: React.ReactNode;
};

export const PullToRefresh = ({ onRefresh, threshold = 80, children }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const reduced = useReducedMotion();

  const onTouchStart = (e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0 || reduced) return;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      // Rubber-band easing — feels like UIScrollView bounce.
      setPull(Math.min(dy * 0.5, threshold * 1.5));
    }
  };

  const onTouchEnd = async () => {
    if (startY.current == null) return;
    const fired = pull >= threshold;
    startY.current = null;
    if (fired) {
      setRefreshing(true);
      setPull(threshold);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="overflow-y-auto h-full"
    >
      <motion.div
        animate={{ height: pull }}
        transition={{ type: refreshing ? "tween" : "spring", stiffness: 280, damping: 28 }}
        className="flex items-end justify-center overflow-hidden"
      >
        <div className="pb-2 flex flex-col items-center text-muted-foreground">
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <motion.div animate={{ rotate: pull >= threshold ? 180 : 0 }} transition={{ duration: 0.15 }}>
              <ArrowDown className="w-4 h-4" />
            </motion.div>
          )}
          <span className="text-[10px] mt-1">
            {refreshing
              ? "Обновляю..."
              : pull >= threshold
                ? "Отпустите для обновления"
                : pull > 10
                  ? "Потяните вниз"
                  : ""}
          </span>
        </div>
      </motion.div>
      {children}
    </div>
  );
};
