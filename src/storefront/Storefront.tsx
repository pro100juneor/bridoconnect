import type { CSSProperties } from "react";
import { themeCssVars, type StorefrontTheme } from "./themes";
import {
  resolveBlockOrder,
  type BlockKey,
  type BlockProps,
  type ShopProfile,
  type SellerSummary,
} from "./types";
import type { Product } from "@/hooks/useProducts";
import Hero from "./blocks/Hero";
import About from "./blocks/About";
import Catalog from "./blocks/Catalog";
import Contacts from "./blocks/Contacts";
import Messengers from "./blocks/Messengers";
import Promo from "./blocks/Promo";

const BLOCKS: Record<BlockKey, (p: BlockProps) => JSX.Element | null> = {
  hero: Hero,
  about: About,
  catalog: Catalog,
  contacts: Contacts,
  messengers: Messengers,
  promo: Promo,
};

// Blocks that read better in a narrow "brand" column for split layouts.
const ASIDE_BLOCKS = new Set<BlockKey>(["hero", "about", "contacts", "messengers", "promo"]);

interface StorefrontProps {
  profile: ShopProfile;
  theme: StorefrontTheme;
  products: Product[];
  seller: SellerSummary | null;
  /** Constrain height for live-preview panes. */
  preview?: boolean;
}

export default function Storefront({ profile, theme, products, seller, preview }: StorefrontProps) {
  const order = resolveBlockOrder(profile.blocks);
  const blockProps: BlockProps = { profile, theme, products, seller };

  const render = (key: BlockKey) => {
    const Cmp = BLOCKS[key];
    return <Cmp key={key} {...blockProps} />;
  };

  const containerStyle: CSSProperties = {
    ...themeCssVars(theme),
    minHeight: preview ? undefined : "100vh",
    width: "100%",
  };

  const maxWidth =
    theme.layout === "fullbleed" || theme.layout === "magazine"
      ? "1200px"
      : theme.layout === "minimal-center"
        ? "720px"
        : "960px";

  const inner: CSSProperties = {
    maxWidth,
    margin: "0 auto",
    padding: "clamp(1rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem)",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  };

  // Two-column layouts: brand column + catalog column.
  const isSplit = theme.layout === "sidebar-left" || theme.layout === "split-brand";

  return (
    <div style={containerStyle} data-layout={theme.layout} data-theme-id={theme.id}>
      {isSplit ? (
        <div style={inner}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(240px, 320px) 1fr",
              gap: "1.5rem",
              alignItems: "start",
            }}
            className="sf-split"
          >
            <aside
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                position: "sticky",
                top: "1rem",
              }}
            >
              {order.filter((k) => ASIDE_BLOCKS.has(k)).map(render)}
            </aside>
            <main style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {order.filter((k) => !ASIDE_BLOCKS.has(k)).map(render)}
            </main>
          </div>
        </div>
      ) : (
        <div style={inner}>{order.map(render)}</div>
      )}

      {/* Responsive: collapse split to single column on narrow screens. */}
      <style>{`
        @media (max-width: 720px) {
          [data-layout] .sf-split { grid-template-columns: 1fr !important; }
          [data-layout] .sf-split > aside { position: static !important; }
        }
      `}</style>
    </div>
  );
}
