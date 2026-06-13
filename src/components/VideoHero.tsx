import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Globe } from "lucide-react";

// 10 главных языков мира по числу носителей. Каждому соответствует
// public/audio/narration/{code}.mp3 (сгенерировано через ElevenLabs multilingual v2).
const LANGS: Array<{ code: string; label: string; flag: string }> = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "bn", label: "বাংলা", flag: "🇧🇩" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
];

const STORAGE_KEY = "brido_video_lang";

function detectInitialLang(): string {
  if (typeof window === "undefined") return "uk";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && LANGS.some((l) => l.code === stored)) return stored;
  const browser = (navigator.language || "uk").slice(0, 2).toLowerCase();
  if (LANGS.some((l) => l.code === browser)) return browser;
  return "uk";
}

/**
 * Animated hero with multi-language voiceover.
 *
 * Pure CSS + SVG animation (no AI-generated video — Runway credits exhausted at
 * v1.0.0-rc1; regenerate later via scripts/runway-gen.mjs once topped up).
 * Audio: 10 ElevenLabs voiceovers in public/audio/narration/{lang}.mp3,
 * ~35 sec each, narrating what BridoConnect is.
 */
export const VideoHero = ({ variant = "hero" }: { variant?: "hero" | "explainer" }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lang, setLang] = useState<string>(() => detectInitialLang());
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const currentLang = useMemo(() => LANGS.find((l) => l.code === lang) || LANGS[9], [lang]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    // Swap source — if was playing, restart from 0 in new language.
    const a = audioRef.current;
    if (!a) return;
    const wasPlaying = !a.paused;
    a.pause();
    a.currentTime = 0;
    a.load();
    if (wasPlaying) a.play().catch(() => setPlaying(false));
  }, [lang]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const isExplainer = variant === "explainer";

  return (
    <section
      className={`relative w-full overflow-hidden rounded-3xl ${
        isExplainer ? "aspect-[16/9]" : "aspect-[4/3] sm:aspect-[16/9]"
      }`}
      aria-label="BridoConnect explainer"
    >
      <div className="absolute inset-0 brido-hero-bg" aria-hidden="true">
        <div className="brido-orb brido-orb-1" />
        <div className="brido-orb brido-orb-2" />
        <div className="brido-orb brido-orb-3" />
        <div className="brido-orb brido-orb-4" />
        <svg
          className="absolute inset-0 w-full h-full opacity-30"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="brido-line" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="brido-path"
            d="M 100,300 Q 300,100 500,300 T 900,300"
            stroke="url(#brido-line)"
            strokeWidth="2"
            fill="none"
          />
          <path
            className="brido-path brido-path-2"
            d="M 50,450 Q 250,250 450,450 T 850,450"
            stroke="url(#brido-line)"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="bg-black/30 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-white text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="font-medium">BridoConnect</span>
          </div>
          <button
            data-testid="video-lang-picker"
            onClick={() => setPickerOpen((v) => !v)}
            className="bg-black/30 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-white text-xs hover:bg-black/40 transition-colors"
            aria-label="Choose language"
          >
            <Globe className="w-3.5 h-3.5" strokeWidth={2} />
            <span>{currentLang.flag}</span>
            <span className="hidden sm:inline">{currentLang.label}</span>
          </button>
        </div>

        {pickerOpen && (
          <div
            className="absolute top-14 right-4 bg-black/70 backdrop-blur-xl rounded-2xl p-2 z-20 shadow-2xl max-w-[200px]"
            role="listbox"
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                data-testid={`video-lang-${l.code}`}
                onClick={() => {
                  setLang(l.code);
                  setPickerOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                  l.code === lang ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10"
                }`}
                aria-selected={l.code === lang}
                role="option"
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end justify-between gap-3">
          <div className="text-white max-w-md">
            <p className="text-[10px] uppercase tracking-widest text-white/60 mb-2">
              {isExplainer ? "How it works" : "Listen to the story"}
            </p>
            <p className="font-serif text-2xl sm:text-3xl leading-tight">
              Один крок — і чиєсь життя <em className="not-italic text-accent">зміниться</em>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="video-mute"
              onClick={() => {
                if (audioRef.current) audioRef.current.muted = !audioRef.current.muted;
                setMuted((v) => !v);
              }}
              className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/40 flex items-center justify-center text-white transition-colors"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <VolumeX className="w-4 h-4" strokeWidth={2} />
              ) : (
                <Volume2 className="w-4 h-4" strokeWidth={2} />
              )}
            </button>
            <button
              data-testid="video-play"
              onClick={toggle}
              className="w-14 h-14 rounded-full bg-white text-foreground hover:scale-105 flex items-center justify-center transition-transform shadow-2xl"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="w-5 h-5" strokeWidth={2} />
              ) : (
                <Play className="w-5 h-5 ml-0.5" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={`/audio/narration/${lang}.mp3`}
        onEnded={() => setPlaying(false)}
        preload="metadata"
      />

      <style>{`
        .brido-hero-bg {
          background: linear-gradient(135deg, #16213e 0%, #0f3460 50%, #533483 100%);
        }
        .brido-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.5;
          animation: brido-float 12s ease-in-out infinite;
        }
        .brido-orb-1 { width: 240px; height: 240px; top: -60px; left: -40px; background: #e94560; animation-delay: 0s; }
        .brido-orb-2 { width: 200px; height: 200px; top: 40%; right: -40px; background: #f5b942; animation-delay: -3s; }
        .brido-orb-3 { width: 280px; height: 280px; bottom: -80px; left: 30%; background: #5cdb95; animation-delay: -6s; }
        .brido-orb-4 { width: 180px; height: 180px; top: 30%; left: 40%; background: #ffffff; opacity: 0.2; animation-delay: -9s; }
        @keyframes brido-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 25px) scale(0.95); }
          75% { transform: translate(15px, 10px) scale(1.05); }
        }
        .brido-path {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: brido-draw 8s ease-in-out infinite alternate;
        }
        .brido-path-2 { animation-delay: -4s; }
        @keyframes brido-draw {
          0% { stroke-dashoffset: 1200; opacity: 0; }
          30% { opacity: 0.8; }
          100% { stroke-dashoffset: 0; opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          .brido-orb, .brido-path { animation: none; }
        }
      `}</style>
    </section>
  );
};

export default VideoHero;
