// Lazy-loaded observability layer: инициализируется только после cookie consent.
// Никаких side-effects на import.
import { getConsent } from "@/components/CookieConsent";

let sentryReady = false;
let posthogReady = false;

async function initSentry() {
  if (sentryReady) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  const Sentry = await import("@sentry/react");
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    beforeSend(event) {
      // Дропаем PII в query/body если случайно попадёт
      if (event.request?.query_string && typeof event.request.query_string === "string") {
        event.request.query_string = event.request.query_string.replace(
          /(token|password|secret)=[^&]+/gi,
          "$1=[REDACTED]"
        );
      }
      return event;
    },
  });
  sentryReady = true;
}

async function initPostHog() {
  if (posthogReady) return;
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return;
  const posthog = (await import("posthog-js")).default;
  posthog.init(key, {
    api_host: (import.meta.env.VITE_POSTHOG_HOST as string) || "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    autocapture: false, // явные события, без auto-clicks
    session_recording: { maskAllInputs: true },
    respect_dnt: true,
  });
  posthogReady = true;
}

export async function applyConsent() {
  const consent = getConsent();
  if (!consent) return;
  const jobs: Promise<unknown>[] = [];
  if (consent.errorTracking) jobs.push(initSentry());
  if (consent.analytics) jobs.push(initPostHog());
  await Promise.allSettled(jobs);
}

export function bootObservability() {
  applyConsent();
  window.addEventListener("brido:consent-changed", () => {
    applyConsent();
  });
}

export async function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!sentryReady) return;
  const Sentry = await import("@sentry/react");
  Sentry.captureException(err, { extra: context });
}

export async function trackEvent(name: string, props?: Record<string, unknown>) {
  if (!posthogReady) return;
  const posthog = (await import("posthog-js")).default;
  posthog.capture(name, props);
}

export async function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!posthogReady) return;
  const posthog = (await import("posthog-js")).default;
  posthog.identify(userId, traits);
  if (sentryReady) {
    const Sentry = await import("@sentry/react");
    Sentry.setUser({ id: userId });
  }
}
