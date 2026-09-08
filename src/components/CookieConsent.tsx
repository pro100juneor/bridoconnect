import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isNative } from "@/lib/native";

// GDPR-compliant cookie banner.
// Хранит выбор в localStorage; при "accept" грузит analytics/Sentry асинхронно.
// Ничего не логирует до явного согласия — на public pages не грузим PostHog/Sentry.

const STORAGE_KEY = "brido-consent-v1";

type Consent = {
  essential: true; // всегда true — сессия, CSRF, auth
  analytics: boolean; // PostHog
  errorTracking: boolean; // Sentry
  ts: number;
};

export function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Consent;
  } catch {
    return null;
  }
}

export function setConsent(patch: Partial<Omit<Consent, "essential" | "ts">>) {
  const next: Consent = {
    essential: true,
    analytics: patch.analytics ?? false,
    errorTracking: patch.errorTracking ?? false,
    ts: Date.now(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("brido:consent-changed", { detail: next }));
  return next;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [errorTracking, setErrorTracking] = useState(true);

  useEffect(() => {
    // У нативному застосунку (App Store, guideline 5.1.2) банера немає:
    // аналітика/трекінг вимкнені назавжди, лишаються тільки необхідні cookies.
    if (isNative) {
      if (getConsent() === null) setConsent({ analytics: false, errorTracking: false });
      return;
    }
    setVisible(getConsent() === null);
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    setConsent({ analytics: true, errorTracking: true });
    setVisible(false);
  };
  const rejectAll = () => {
    setConsent({ analytics: false, errorTracking: false });
    setVisible(false);
  };
  const savePreferences = () => {
    setConsent({ analytics, errorTracking });
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-desc"
      className="fixed inset-x-4 bottom-4 z-[9999] mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:inset-x-6"
    >
      <h2 id="cookie-title" className="text-lg font-semibold text-neutral-900">
        Ми використовуємо cookies
      </h2>
      <p id="cookie-desc" className="mt-2 text-sm leading-relaxed text-neutral-600">
        Необхідні cookies для роботи сайту (авторизація, безпека) — завжди активні. За вашою згодою ми
        додатково використовуємо analytics (PostHog, EU-hosted) та error tracking (Sentry) для покращення
        сервісу. Детальніше —{" "}
        <Link to="/datenschutz" className="underline hover:text-red-600">
          Datenschutzerklärung
        </Link>
        .
      </p>

      {showDetails && (
        <div className="mt-4 space-y-3 border-t border-neutral-200 pt-4 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked disabled className="mt-1 h-4 w-4" />
            <div>
              <div className="font-medium text-neutral-900">Необхідні</div>
              <div className="text-xs text-neutral-500">
                Session, CSRF-token, вибір мови. Не можуть бути вимкнені.
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <div>
              <div className="font-medium text-neutral-900">Аналітика</div>
              <div className="text-xs text-neutral-500">
                Анонімна статистика використання (PostHog, EU). Допомагає покращувати UX.
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={errorTracking}
              onChange={(e) => setErrorTracking(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <div>
              <div className="font-medium text-neutral-900">Error tracking</div>
              <div className="text-xs text-neutral-500">
                Sentry — збір технічних помилок для швидшого фіксу.
              </div>
            </div>
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-sm text-neutral-500 underline hover:text-neutral-800"
        >
          {showDetails ? "Приховати" : "Налаштування"}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={rejectAll}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Тільки необхідні
        </button>
        {showDetails ? (
          <button
            type="button"
            onClick={savePreferences}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Зберегти вибір
          </button>
        ) : (
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Прийняти все
          </button>
        )}
      </div>
    </div>
  );
}
