import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Globe } from "lucide-react";

// 48 наиболее распространённых языков мира + UA. Каждому соответствует
// public/audio/narration/{code}.mp3 (ElevenLabs multilingual_v2, ~55 sec
// explainer: что такое BridoConnect и как им пользоваться).
const LANGS: Array<{ code: string; label: string; flag: string }> = [
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "bn", label: "বাংলা", flag: "🇧🇩" },
  { code: "ru", label: "русский", flag: "🏳️" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "id", label: "Indonesia", flag: "🇮🇩" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "fa", label: "فارسی", flag: "🇮🇷" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ur", label: "اردو", flag: "🇵🇰" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "ta", label: "தமிழ்", flag: "🇮🇳" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "ms", label: "Melayu", flag: "🇲🇾" },
  { code: "fil", label: "Filipino", flag: "🇵🇭" },
  { code: "sw", label: "Kiswahili", flag: "🇰🇪" },
  { code: "mr", label: "मराठी", flag: "🇮🇳" },
  { code: "te", label: "తెలుగు", flag: "🇮🇳" },
  { code: "gu", label: "ગુજરાતી", flag: "🇮🇳" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "he", label: "עברית", flag: "🇮🇱" },
  { code: "da", label: "Dansk", flag: "🇩🇰" },
  { code: "fi", label: "Suomi", flag: "🇫🇮" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
  { code: "sk", label: "Slovenčina", flag: "🇸🇰" },
  { code: "bg", label: "Български", flag: "🇧🇬" },
  { code: "hr", label: "Hrvatski", flag: "🇭🇷" },
  { code: "sr", label: "Српски", flag: "🇷🇸" },
  { code: "sq", label: "Shqip", flag: "🇦🇱" },
  { code: "mk", label: "Македонски", flag: "🇲🇰" },
  { code: "lt", label: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", label: "Latviešu", flag: "🇱🇻" },
  { code: "et", label: "Eesti", flag: "🇪🇪" },
  { code: "ca", label: "Català", flag: "🏴󠁥󠁳󠁣󠁴󠁿" },
];

const STORAGE_KEY = "brido_video_lang";

function detectInitialLang(): string {
  if (typeof window === "undefined") return "uk";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && LANGS.some((l) => l.code === stored)) return stored;
  // Browser locale: try full code first (zh-CN → zh, pt-BR → pt), then 2-letter.
  const full = (navigator.language || "uk").toLowerCase();
  const two = full.slice(0, 2);
  // Special cases: navigator.language often returns "fil" or "tl" for Filipino.
  if (full.startsWith("fil") || full === "tl") return "fil";
  if (LANGS.some((l) => l.code === two)) return two;
  return "uk";
}

/**
 * Hero with Runway-generated background video + multi-language voiceover.
 *
 * Video: public/videos/hero-loop.mp4 (Seedance2 Fast, 5s loop, warm humans
 * helping across borders). Audio: 10 ElevenLabs voiceovers in
 * public/audio/narration/{lang}.mp3, ~35 sec each.
 * Animated CSS+SVG layer remains as fallback when video fails to load.
 */
// Premium video source per variant. hero-connection — gen4.5 cinematic; other
// scenes are seedance2 supporting cuts. hero-loop.mp4 kept as legacy fallback.
const VIDEO_SRC: Record<"hero" | "explainer" | "trust" | "direct" | "hope" | "people" | "global", string> = {
  hero: "/videos/hero-story-ua.mp4", // 35s UA-context: 4 Runway cinematic + 3 phone walkthrough
  explainer: "/videos/direct-exchange.mp4",
  trust: "/videos/trust-shield.mp4",
  direct: "/videos/direct-exchange.mp4",
  hope: "/videos/hope.mp4",
  people: "/videos/verified-people.mp4",
  global: "/videos/global-reach.mp4",
};

export const VideoHero = ({ variant = "hero" }: { variant?: keyof typeof VIDEO_SRC }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [lang, setLang] = useState<string>(() => detectInitialLang());
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [videoFailed, setVideoFailed] = useState(false);

  const currentLang = useMemo(() => LANGS.find((l) => l.code === lang) || LANGS[0], [lang]);
  const filteredLangs = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return LANGS;
    return LANGS.filter((l) => l.label.toLowerCase().includes(q) || l.code.includes(q));
  }, [pickerQuery]);

  // iOS WebKit: autoPlay attribute alone isn't always enough on first load
  // (especially in PWA / Capacitor context). Imperatively start playback after mount.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.play().catch(() => {
      // Some iOS versions / low-power mode block autoplay even when muted.
      // Fall back to animated CSS background.
      setVideoFailed(true);
    });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
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

  const isExplainer = variant !== "hero";

  return (
    <section
      className="relative w-full overflow-hidden rounded-3xl aspect-[16/9]"
      aria-label="BridoConnect explainer"
    >
      {!videoFailed && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src={VIDEO_SRC[variant]}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 z-[1]"
        aria-hidden="true"
      />
      <div
        className={`absolute inset-0 brido-hero-bg transition-opacity ${videoFailed ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      >
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
            className="absolute top-14 right-4 bg-black/80 backdrop-blur-xl rounded-2xl p-2 z-20 shadow-2xl w-[240px] max-h-[60vh] flex flex-col"
            role="listbox"
          >
            <input
              type="text"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search 48 languages…"
              className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-lg px-3 py-2 text-xs mb-1.5 outline-none focus:bg-white/20"
              autoFocus
            />
            <div className="overflow-y-auto flex-1 -mr-1 pr-1">
              {filteredLangs.length === 0 ? (
                <p className="text-white/50 text-xs px-3 py-2">No match</p>
              ) : (
                filteredLangs.map((l) => (
                  <button
                    key={l.code}
                    data-testid={`video-lang-${l.code}`}
                    onClick={() => {
                      setLang(l.code);
                      setPickerOpen(false);
                      setPickerQuery("");
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                      l.code === lang ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10"
                    }`}
                    aria-selected={l.code === lang}
                    role="option"
                  >
                    <span>{l.flag}</span>
                    <span className="truncate">{l.label}</span>
                  </button>
                ))
              )}
            </div>
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
