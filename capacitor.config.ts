import type { CapacitorConfig } from "@capacitor/cli";

// BridoConnect iOS native shell — wraps the Vite-built PWA in a Capacitor
// container so we can deploy to iPhone via Xcode + reach native APIs
// (Haptics, Share sheet, Status bar, Biometric, Keyboard).
const config: CapacitorConfig = {
  appId: "de.brido.connect",
  appName: "BridoConnect",
  webDir: "dist",
  // iPhone-only for now. Background launch + iOS conventions.
  ios: {
    contentInset: "automatic", // respect safe-area (notch / dynamic island)
    backgroundColor: "#faf8f5",
  },
  server: {
    // Use Capacitor's default `capacitor://` scheme — `ionic://` made iOS
    // show a "Open in app" deeplink prompt every launch.
    androidScheme: "https",
    // Set CAP_LIVE_RELOAD=1 to point the app at the Mac's dev server during
    // development (so the iPhone gets hot-reload).
    ...(process.env.CAP_LIVE_RELOAD === "1"
      ? { url: process.env.CAP_DEV_URL ?? "http://10.0.1.117:8080", cleartext: true }
      : {}),
  },
  plugins: {
    StatusBar: {
      style: "default",
      backgroundColor: "#0f3460",
    },
    Keyboard: {
      resize: "native",
      style: "default",
    },
  },
};

export default config;
