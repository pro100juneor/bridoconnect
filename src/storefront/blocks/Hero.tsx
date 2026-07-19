import { Store } from "lucide-react";
import type { BlockProps } from "../types";

// Hero: logo + shop name + tagline, optionally over a banner image.
// Layout-aware: centered for minimal-center/banner-stack, left-aligned otherwise.
export default function Hero({ profile, theme, seller }: BlockProps) {
  const name = profile.brand.name || seller?.name || "Магазин";
  const tagline = profile.brand.tagline;
  const banner = profile.brand.banner_url;
  const centered =
    theme.layout === "minimal-center" || theme.layout === "banner-stack" || theme.layout === "fullbleed";

  const initials = name.slice(0, 2).toUpperCase();

  return (
    <section
      className="sf-block sf-hero"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--sf-radius)",
        border: "var(--sf-border)",
        boxShadow: "var(--sf-shadow)",
        background: banner ? undefined : "var(--sf-surface)",
        padding: banner ? 0 : "2rem 1.5rem",
      }}
    >
      {banner && (
        <>
          <img
            src={banner}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: theme.palette.dark
                ? "linear-gradient(180deg, rgb(0 0 0 / 0.25), rgb(0 0 0 / 0.75))"
                : "linear-gradient(180deg, rgb(0 0 0 / 0.15), rgb(0 0 0 / 0.6))",
            }}
          />
        </>
      )}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: centered ? "center" : "flex-start",
          textAlign: centered ? "center" : "left",
          gap: "0.75rem",
          padding: banner ? "3rem 1.5rem" : 0,
          color: banner ? "#fff" : "var(--sf-fg)",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "var(--sf-radius)",
            background: profile.logo_url ? "transparent" : "var(--sf-primary)",
            color: "var(--sf-on-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--sf-font-heading)",
            fontSize: 26,
            overflow: "hidden",
            flexShrink: 0,
            boxShadow: banner ? "0 4px 16px rgb(0 0 0 / 0.35)" : undefined,
          }}
        >
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              alt={`${name} логотип`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials || <Store size={30} strokeWidth={1.5} />
          )}
        </div>
        <h1
          style={{
            fontFamily: "var(--sf-font-heading)",
            fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          {name}
        </h1>
        {tagline && (
          <p
            style={{
              margin: 0,
              maxWidth: "42ch",
              fontSize: "1rem",
              color: banner ? "rgb(255 255 255 / 0.9)" : "var(--sf-muted)",
            }}
          >
            {tagline}
          </p>
        )}
      </div>
    </section>
  );
}
