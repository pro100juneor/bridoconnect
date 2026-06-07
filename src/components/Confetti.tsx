// TZ §17.4 — `confetti` animation. Lightweight DOM-particle confetti, no
// canvas. Mounts ~60 particles that fall + drift + rotate for 2 s. Auto-cleans.
import { useEffect, useState } from "react";

const COLORS = ["#d94030", "#0f3460", "#2d9e6a", "#f5a623", "#c97f3e"];

type Particle = {
  id: number;
  x: number; // %
  drift: number; // px sideways
  delay: number; // ms
  rotate: number; // deg
  color: string;
};

const PARTICLES: Particle[] = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  drift: (Math.random() - 0.5) * 200,
  delay: Math.random() * 600,
  rotate: Math.random() * 360,
  color: COLORS[i % COLORS.length],
}));

export const Confetti = ({ trigger }: { trigger: boolean }) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setActive(true);
    const id = setTimeout(() => setActive(false), 2200);
    return () => clearTimeout(id);
  }, [trigger]);

  if (!active) return null;

  return (
    <>
      <style>{`
        @keyframes brido-confetti-fall {
          0% { transform: translate3d(0,-20px,0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(var(--drift), 110vh, 0) rotate(var(--rot)); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-[60]" aria-hidden="true">
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 block w-2 h-3 rounded-sm"
            style={{
              left: `${p.x}%`,
              background: p.color,
              animation: `brido-confetti-fall 2s ease-out ${p.delay}ms forwards`,
              ["--drift" as string]: `${p.drift}px`,
              ["--rot" as string]: `${p.rotate}deg`,
            }}
          />
        ))}
      </div>
    </>
  );
};
