import type { BlockProps } from "../types";

// Promo: optional highlight banner (title + text). Hidden if both empty.
export default function Promo({ profile }: BlockProps) {
  const title = profile.brand.promo_title?.trim();
  const text = profile.brand.promo_text?.trim();
  if (!title && !text) return null;

  return (
    <section
      className="sf-block sf-promo"
      style={{
        borderRadius: "var(--sf-radius)",
        background: "linear-gradient(135deg, var(--sf-primary), var(--sf-accent))",
        color: "var(--sf-on-primary)",
        padding: "1.75rem",
        boxShadow: "var(--sf-shadow)",
      }}
    >
      {title && (
        <h2 style={{ fontFamily: "var(--sf-font-heading)", fontSize: "1.5rem", margin: "0 0 0.5rem" }}>
          {title}
        </h2>
      )}
      {text && <p style={{ margin: 0, lineHeight: 1.5, opacity: 0.95 }}>{text}</p>}
    </section>
  );
}
