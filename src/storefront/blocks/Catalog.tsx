import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import type { BlockProps } from "../types";

// Catalog: seller's products. Grid or list depending on layout.
export default function Catalog({ products, theme }: BlockProps) {
  const { convert } = useCurrency();

  const listLayout = theme.layout === "compact-list" || theme.layout === "sidebar-left";
  const cols =
    theme.layout === "masonry" || theme.layout === "grid-hero"
      ? "repeat(auto-fill, minmax(180px, 1fr))"
      : "repeat(auto-fill, minmax(200px, 1fr))";

  return (
    <section className="sf-block sf-catalog">
      <h2
        style={{
          fontFamily: "var(--sf-font-heading)",
          fontSize: "1.5rem",
          margin: "0 0 1rem",
        }}
      >
        Товари{products.length > 0 ? ` (${products.length})` : ""}
      </h2>

      {products.length === 0 ? (
        <p style={{ color: "var(--sf-muted)", margin: 0 }}>Поки що немає товарів.</p>
      ) : listLayout ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {products.map((p) => (
            <Link
              key={p.id}
              to={`/app/shop/${p.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.875rem",
                padding: "0.75rem",
                borderRadius: "var(--sf-radius)",
                border: "var(--sf-border)",
                boxShadow: "var(--sf-shadow)",
                background: "var(--sf-surface)",
                color: "var(--sf-fg)",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "calc(var(--sf-radius) * 0.7)",
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "var(--sf-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {p.images[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Package size={22} color="var(--sf-muted)" strokeWidth={1.5} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{p.title}</p>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--sf-muted)" }}>
                  {p.category || "Товар"}
                </p>
              </div>
              <span style={{ fontWeight: 700, color: "var(--sf-primary)" }}>
                {convert(p.price_cents).formatted}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: "1rem" }}>
          {products.map((p) => (
            <Link
              key={p.id}
              to={`/app/shop/${p.id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: "var(--sf-radius)",
                border: "var(--sf-border)",
                boxShadow: "var(--sf-shadow)",
                background: "var(--sf-surface)",
                color: "var(--sf-fg)",
                textDecoration: "none",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  aspectRatio: "1 / 1",
                  background: "var(--sf-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {p.images[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Package size={32} color="var(--sf-muted)" strokeWidth={1.5} />
                )}
              </div>
              <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--sf-muted)" }}>
                  {p.category || "Товар"}
                </p>
                <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.25 }}>{p.title}</p>
                <span style={{ fontWeight: 700, color: "var(--sf-primary)" }}>
                  {convert(p.price_cents).formatted}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
