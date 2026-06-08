// Thin wrapper around Capacitor native APIs. Falls back to web equivalents
// when running in a browser (PWA / dev preview) so the same call site works
// both in Xcode-built iOS shell and in mobile Safari.
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard } from "@capacitor/keyboard";

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

// Subtle / medium / heavy taps used on button press, swipe-confirm, etc.
export async function tap(style: "light" | "medium" | "heavy" = "light") {
  if (!isNative) return;
  const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
  try {
    await Haptics.impact({ style: map[style] });
  } catch {
    /* haptics unavailable on this device */
  }
}

// Success / warning / error patterns for toast moments (donation confirmed,
// dispute opened, error toast).
export async function notify(kind: "success" | "warning" | "error" = "success") {
  if (!isNative) return;
  const map = {
    success: NotificationType.Success,
    warning: NotificationType.Warning,
    error: NotificationType.Error,
  };
  try {
    await Haptics.notification({ type: map[kind] });
  } catch {
    /* noop */
  }
}

// Native share sheet on iOS, navigator.share / clipboard fallback on web.
export async function share(opts: { title?: string; text?: string; url?: string }) {
  if (isNative) {
    try {
      await Share.share(opts);
      return true;
    } catch {
      return false;
    }
  }
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share(opts);
      return true;
    } catch {
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(opts.url ?? opts.text ?? "");
    return true;
  } catch {
    return false;
  }
}

// Status bar tinting — call from a top-level effect when route changes
// background. Dark text + light bg vs light text + dark bg.
export async function setStatusBar(style: "light" | "dark", bg?: string) {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({ style: style === "light" ? Style.Light : Style.Dark });
    if (bg) await StatusBar.setBackgroundColor({ color: bg });
  } catch {
    /* noop */
  }
}

// Listen for keyboard show/hide so we can lift the bottom-input above it
// (Chat composer pattern). Returns unsubscribe.
export function onKeyboard(show: (height: number) => void, hide: () => void): () => void {
  if (!isNative) return () => {};
  const s = Keyboard.addListener("keyboardDidShow", (info) => show(info.keyboardHeight));
  const h = Keyboard.addListener("keyboardDidHide", () => hide());
  return () => {
    void s.then((sub) => sub.remove());
    void h.then((sub) => sub.remove());
  };
}
