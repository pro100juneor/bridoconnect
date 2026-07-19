import { MessageCircle } from "lucide-react";
import { buildMessengerLinks } from "../types";
import type { BlockProps } from "../types";

// Messengers: deep-link buttons to reach the shop. Only filled channels shown.
export default function Messengers({ profile }: BlockProps) {
  const links = buildMessengerLinks(profile.messengers);
  if (links.length === 0) return null;

  return (
    <section
      className="sf-block sf-messengers"
      style={{
        borderRadius: "var(--sf-radius)",
        border: "var(--sf-border)",
        boxShadow: "var(--sf-shadow)",
        background: "var(--sf-surface)",
        padding: "1.5rem",
      }}
    >
      <h2 style={{ fontFamily: "var(--sf-font-heading)", fontSize: "1.35rem", margin: "0 0 1rem" }}>
        Зв'язатися з нами
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        {links.map((l) => (
          <a
            key={l.key}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.65rem 1.1rem",
              borderRadius: "var(--sf-radius)",
              background: "var(--sf-primary)",
              color: "var(--sf-on-primary)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <MessageCircle size={16} strokeWidth={2} />
            {l.label}
          </a>
        ))}
      </div>
    </section>
  );
}
