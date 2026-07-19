import { Phone, Mail, MapPin, Globe } from "lucide-react";
import type { BlockProps } from "../types";

// Contacts: phone / email / address / site. Hidden entirely if all empty.
export default function Contacts({ profile }: BlockProps) {
  const c = profile.contacts;
  const rows: { icon: React.ReactNode; label: string; href?: string }[] = [];
  if (c.phone)
    rows.push({ icon: <Phone size={16} />, label: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` });
  if (c.email) rows.push({ icon: <Mail size={16} />, label: c.email, href: `mailto:${c.email}` });
  if (c.address) rows.push({ icon: <MapPin size={16} />, label: c.address });
  if (c.site) {
    const href = /^https?:\/\//.test(c.site) ? c.site : `https://${c.site}`;
    rows.push({ icon: <Globe size={16} />, label: c.site, href });
  }
  if (rows.length === 0) return null;

  return (
    <section
      className="sf-block sf-contacts"
      style={{
        borderRadius: "var(--sf-radius)",
        border: "var(--sf-border)",
        boxShadow: "var(--sf-shadow)",
        background: "var(--sf-surface)",
        padding: "1.5rem",
      }}
    >
      <h2 style={{ fontFamily: "var(--sf-font-heading)", fontSize: "1.35rem", margin: "0 0 1rem" }}>
        Контакти
      </h2>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {rows.map((r, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <span style={{ color: "var(--sf-primary)", display: "inline-flex" }}>{r.icon}</span>
            {r.href ? (
              <a
                href={r.href}
                target={r.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                style={{ color: "var(--sf-fg)", textDecoration: "none", wordBreak: "break-word" }}
              >
                {r.label}
              </a>
            ) : (
              <span style={{ color: "var(--sf-fg)", wordBreak: "break-word" }}>{r.label}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
