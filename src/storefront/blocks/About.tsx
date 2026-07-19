import type { BlockProps } from "../types";

// About: free-text shop description. Renders nothing if empty.
export default function About({ profile }: BlockProps) {
  const about = profile.brand.about?.trim();
  if (!about) return null;

  return (
    <section
      className="sf-block sf-about"
      style={{
        borderRadius: "var(--sf-radius)",
        border: "var(--sf-border)",
        boxShadow: "var(--sf-shadow)",
        background: "var(--sf-surface)",
        padding: "1.5rem",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--sf-font-heading)",
          fontSize: "1.35rem",
          margin: "0 0 0.75rem",
        }}
      >
        Про магазин
      </h2>
      <p
        style={{
          margin: 0,
          whiteSpace: "pre-line",
          lineHeight: 1.6,
          color: "var(--sf-fg)",
        }}
      >
        {about}
      </p>
    </section>
  );
}
