import type React from "react";

// ---------------------------------------------------------------------------
// Storefront theme engine
// ---------------------------------------------------------------------------
// 200 deterministically-distinct themes are built from a small matrix of
// primitives. Every theme is guaranteed unique (see getTheme's indexing).
// No external CDNs/fonts — only DM Sans / DM Serif Display (already loaded)
// plus native system stacks are used.
// ---------------------------------------------------------------------------

export type LayoutKey =
  | "topnav-hero"
  | "sidebar-left"
  | "magazine"
  | "grid-hero"
  | "minimal-center"
  | "split-brand"
  | "fullbleed"
  | "masonry"
  | "compact-list"
  | "banner-stack";

export const LAYOUTS: LayoutKey[] = [
  "topnav-hero",
  "sidebar-left",
  "magazine",
  "grid-hero",
  "minimal-center",
  "split-brand",
  "fullbleed",
  "masonry",
  "compact-list",
  "banner-stack",
];

export interface Palette {
  name: string;
  dark: boolean;
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  primary: string;
  accent: string;
  onPrimary: string;
}

// 10 distinct palettes — light + dark, spanning the color wheel (not red-only).
export const PALETTES: Palette[] = [
  {
    name: "Ivory Rose",
    dark: false,
    bg: "#faf7f5",
    surface: "#ffffff",
    fg: "#241c1a",
    muted: "#8a7d78",
    primary: "#b23a48",
    accent: "#e0607e",
    onPrimary: "#ffffff",
  },
  {
    name: "Midnight Indigo",
    dark: true,
    bg: "#0f1226",
    surface: "#1a1f3d",
    fg: "#eef0ff",
    muted: "#9aa0c8",
    primary: "#6c7bff",
    accent: "#a78bfa",
    onPrimary: "#0f1226",
  },
  {
    name: "Forest Sage",
    dark: false,
    bg: "#f3f6f1",
    surface: "#ffffff",
    fg: "#1c2a1e",
    muted: "#6d7c6b",
    primary: "#2f6b46",
    accent: "#5fa777",
    onPrimary: "#ffffff",
  },
  {
    name: "Ocean Deep",
    dark: true,
    bg: "#08161c",
    surface: "#0f2830",
    fg: "#e2f6fb",
    muted: "#88b4be",
    primary: "#12a0c4",
    accent: "#3fd6d6",
    onPrimary: "#04141a",
  },
  {
    name: "Sunset Amber",
    dark: false,
    bg: "#fff8ef",
    surface: "#ffffff",
    fg: "#2b1d10",
    muted: "#9a7f62",
    primary: "#d97706",
    accent: "#f59e0b",
    onPrimary: "#ffffff",
  },
  {
    name: "Slate Mono",
    dark: false,
    bg: "#f4f5f7",
    surface: "#ffffff",
    fg: "#1b2430",
    muted: "#6b7686",
    primary: "#334155",
    accent: "#64748b",
    onPrimary: "#ffffff",
  },
  {
    name: "Royal Plum",
    dark: true,
    bg: "#1a0f22",
    surface: "#2a1838",
    fg: "#f7ecff",
    muted: "#b295c4",
    primary: "#9333ea",
    accent: "#c084fc",
    onPrimary: "#160b1d",
  },
  {
    name: "Coral Cream",
    dark: false,
    bg: "#fef6f4",
    surface: "#ffffff",
    fg: "#3a1f1a",
    muted: "#a3776d",
    primary: "#ef5350",
    accent: "#ff8a65",
    onPrimary: "#ffffff",
  },
  {
    name: "Emerald Noir",
    dark: true,
    bg: "#061512",
    surface: "#0d2620",
    fg: "#e3fbf1",
    muted: "#7fb8a3",
    primary: "#10b981",
    accent: "#34d399",
    onPrimary: "#04120e",
  },
  {
    name: "Teal Porcelain",
    dark: false,
    bg: "#f0f7f7",
    surface: "#ffffff",
    fg: "#0f2b2b",
    muted: "#5f8383",
    primary: "#0d9488",
    accent: "#2dd4bf",
    onPrimary: "#ffffff",
  },
];

export interface FontPair {
  heading: string;
  body: string;
}

// 4 typographic systems from already-available fonts + system stacks (no CDN).
const SERIF = '"DM Serif Display", ui-serif, Georgia, serif';
const SANS = '"DM Sans", system-ui, sans-serif';
const SYSTEM = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, "SFMono-Regular", "Menlo", monospace';

export const FONTS: FontPair[] = [
  { heading: SERIF, body: SANS }, // editorial
  { heading: SANS, body: SANS }, // clean grotesk
  { heading: SYSTEM, body: SYSTEM }, // native
  { heading: MONO, body: SANS }, // technical
];

export interface BlockStyle {
  name: string;
  radius: string;
  shadow: string;
  border: string;
}

// 2 card/surface treatments.
export const BLOCK_STYLES: BlockStyle[] = [
  {
    name: "soft",
    radius: "1rem",
    shadow: "0 1px 2px rgb(0 0 0 / 0.05), 0 8px 24px rgb(0 0 0 / 0.06)",
    border: "1px solid transparent",
  },
  {
    name: "outline",
    radius: "0.375rem",
    shadow: "none",
    border: "1px solid var(--sf-outline)",
  },
];

export interface StorefrontTheme {
  id: number;
  name: string;
  layout: LayoutKey;
  palette: Palette;
  fonts: FontPair;
  block: BlockStyle;
}

export const THEME_COUNT = 200;

// ---------------------------------------------------------------------------
// Indexing formula (200 guaranteed-distinct themes)
// ---------------------------------------------------------------------------
// id 1..200  ->  i = id - 1  (0..199)
//   layout  = i % 10                     (10 layouts)
//   palette = floor(i / 10) % 10         (10 palettes)
//   block   = floor(i / 100) % 2         (2 block styles)
// The triple (layout, palette, block) is a mixed-radix decomposition of i over
// 10*10*2 = 200, so all 200 ids map to a UNIQUE (layout, palette, block).
//   font    = (layout + palette * 3 + block) % 4
// Font varies across the set for extra visual spread; uniqueness is already
// guaranteed by the triple, so deriving font never collapses two themes.
// ---------------------------------------------------------------------------
export function getTheme(id: number): StorefrontTheme {
  const clamped = Math.min(THEME_COUNT, Math.max(1, Math.round(id || 1)));
  const i = clamped - 1;

  const layoutIdx = i % 10;
  const paletteIdx = Math.floor(i / 10) % 10;
  const blockIdx = Math.floor(i / 100) % 2;
  const fontIdx = (layoutIdx + paletteIdx * 3 + blockIdx) % 4;

  const layout = LAYOUTS[layoutIdx];
  const palette = PALETTES[paletteIdx];
  const fonts = FONTS[fontIdx];
  const block = BLOCK_STYLES[blockIdx];

  return {
    id: clamped,
    name: `${palette.name} · ${layout}`,
    layout,
    palette,
    fonts,
    block,
  };
}

// CSS custom properties consumed by the storefront container + blocks.
export function themeCssVars(theme: StorefrontTheme): React.CSSProperties {
  const p = theme.palette;
  const outline = p.dark ? "rgb(255 255 255 / 0.14)" : "rgb(0 0 0 / 0.10)";
  return {
    // color tokens
    ["--sf-bg" as string]: p.bg,
    ["--sf-surface" as string]: p.surface,
    ["--sf-fg" as string]: p.fg,
    ["--sf-muted" as string]: p.muted,
    ["--sf-primary" as string]: p.primary,
    ["--sf-accent" as string]: p.accent,
    ["--sf-on-primary" as string]: p.onPrimary,
    ["--sf-outline" as string]: outline,
    // shape + type
    ["--sf-radius" as string]: theme.block.radius,
    ["--sf-shadow" as string]: theme.block.shadow,
    ["--sf-border" as string]: theme.block.border,
    ["--sf-font-heading" as string]: theme.fonts.heading,
    ["--sf-font-body" as string]: theme.fonts.body,
    // applied to the container itself
    background: "var(--sf-bg)",
    color: "var(--sf-fg)",
    fontFamily: "var(--sf-font-body)",
  } as React.CSSProperties;
}
