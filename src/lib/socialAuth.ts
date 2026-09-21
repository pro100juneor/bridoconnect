// Единая точка входа для соц-логина (Apple / Google).
//
// iOS (нативно): @capgo/capacitor-social-login отдаёт OIDC id_token из системной
// шторки Apple/Google, который мы меняем на сессию Supabase через
// signInWithIdToken — без браузера и redirect'ов.
// Web: обычный signInWithOAuth (hosted redirect Supabase), detectSessionInUrl
// уже включён в клиенте.
//
// ВАЖНО: реальная аутентификация заработает только после настройки провайдеров
// (Apple Developer / Google Cloud / Supabase Dashboard) и заполнения env —
// см. docs/SOCIAL_LOGIN_SETUP.md. Без ключей login вернёт ошибку, которую
// вызывающий экран показывает тостом.
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/native";

export type SocialProvider = "google" | "apple";
export type SocialResult = { error: string | null };

// Client-id'ы нужны только на нативном iOS (web использует конфиг провайдера в
// Supabase). Пустые значения до настройки — init просто не поднимется, и login
// отдаст ошибку.
const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

let initPromise: Promise<void> | null = null;

// Динамический импорт: web-бандл не тянет натив-плагин до первого нативного вызова.
async function ensureInit(): Promise<void> {
  if (!isNative) return;
  if (!initPromise) {
    initPromise = (async () => {
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      const options: Parameters<typeof SocialLogin.initialize>[0] = {
        apple: {
          // На iOS clientId не используется на уровне ОС — только чтобы плагин
          // знал, какой провайдер инициализировать; redirect на iOS не нужен.
          clientId: "de.brido.connect",
          redirectUrl: "",
        },
      };
      // Google инициализируем ТОЛЬКО при наличии client-id: без него нативный
      // GoogleSignIn SDK не сконфигурирован, и init/login роняют процесс (нативный
      // fatal, который JS-try/catch не ловит).
      if (GOOGLE_IOS_CLIENT_ID) {
        options.google = {
          iOSClientId: GOOGLE_IOS_CLIENT_ID,
          // iOSServerClientId должен совпадать с webClientId (audience id_token'а).
          iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
        };
      }
      await SocialLogin.initialize(options);
    })().catch((e) => {
      // Сбрасываем, чтобы следующая попытка (после настройки env) переинициализировала.
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}

// Прогрев инициализации при старте приложения (App.tsx). Ошибку глотаем: если
// провайдеры ещё не настроены, реальную ошибку покажем при нажатии кнопки.
export async function initSocialLogin(): Promise<void> {
  try {
    await ensureInit();
  } catch {
    /* провайдеры не настроены — тихо, ошибка всплывёт на login() */
  }
}

// Случайная строка для nonce (Apple, защита от replay).
function randomNonce(length = 32): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signInWithGoogle(): Promise<SocialResult> {
  if (!isNative) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/app" },
    });
    return { error: error?.message ?? null };
  }
  // КРИТИЧНО: без iOS client-id нативный GoogleSignIn падает фатально (краш процесса),
  // а не бросает ловимую ошибку. Поэтому вообще не трогаем нативный SDK, пока не настроен.
  if (!GOOGLE_IOS_CLIENT_ID) return { error: "google_not_configured" };
  try {
    await ensureInit();
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    const res = await SocialLogin.login({ provider: "google", options: {} });
    const idToken = res.provider === "google" && "idToken" in res.result ? res.result.idToken : null;
    if (!idToken) return { error: "no_id_token" };
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
    return { error: error?.message ?? null };
  } catch (e) {
    console.error("[socialAuth] google login failed", e);
    return { error: e instanceof Error ? e.message : "google_login_failed" };
  }
}

export async function signInWithApple(): Promise<SocialResult> {
  if (!isNative) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: window.location.origin + "/app" },
    });
    return { error: error?.message ?? null };
  }
  // Нативные вызовы плагина бросают исключения (напр. нет entitlement «Sign in with
  // Apple») — оборачиваем, чтобы функция всегда возвращала {error}, а не зависала.
  try {
    await ensureInit();
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    // Apple: хэшированный nonce уходит в системный запрос (Apple эхонит его в claim
    // id_token'а), сырой отдаём Supabase — он хэширует и сверяет с claim.
    const rawNonce = randomNonce();
    const hashedNonce = await sha256Hex(rawNonce);
    const res = await SocialLogin.login({
      provider: "apple",
      options: { scopes: ["email", "name"], nonce: hashedNonce },
    });
    const idToken = res.provider === "apple" ? res.result.idToken : null;
    if (!idToken) return { error: "no_id_token" };
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: idToken,
      nonce: rawNonce,
    });
    return { error: error?.message ?? null };
  } catch (e) {
    console.error("[socialAuth] apple login failed", e);
    return { error: e instanceof Error ? e.message : "apple_login_failed" };
  }
}
