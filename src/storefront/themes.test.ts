import { describe, it, expect } from "vitest";
import { getTheme, THEME_COUNT, LAYOUTS, PALETTES, BLOCK_STYLES, FONTS } from "./themes";

describe("getTheme", () => {
  it("returns a fully-resolved theme for every id 1..200 (no undefined lookups)", () => {
    for (let id = 1; id <= THEME_COUNT; id++) {
      const t = getTheme(id);
      expect(t.id).toBe(id);
      expect(t.layout).toBeTruthy();
      expect(t.palette).toBeTruthy();
      expect(t.fonts).toBeTruthy();
      expect(t.block).toBeTruthy();
      expect(t.name).toContain("·");
    }
  });

  it("clamps out-of-range and non-integer ids into 1..200", () => {
    expect(getTheme(0).id).toBe(1);
    expect(getTheme(-5).id).toBe(1);
    expect(getTheme(999).id).toBe(THEME_COUNT);
    expect(getTheme(3.7).id).toBe(4);
    // NaN/0-ish falls back to theme 1 via the `id || 1` guard.
    expect(getTheme(Number.NaN).id).toBe(1);
  });

  it("produces 200 distinct (layout, palette, block) triples", () => {
    const seen = new Set<string>();
    for (let id = 1; id <= THEME_COUNT; id++) {
      const t = getTheme(id);
      seen.add(`${t.layout}|${t.palette.name}|${t.block.name ?? BLOCK_STYLES.indexOf(t.block)}`);
    }
    expect(seen.size).toBe(THEME_COUNT);
  });

  it("has enough primitives to satisfy the indexing formula", () => {
    expect(LAYOUTS.length).toBe(10);
    expect(PALETTES.length).toBe(10);
    expect(BLOCK_STYLES.length).toBe(2);
    expect(FONTS.length).toBeGreaterThanOrEqual(4); // fontIdx is mod 4
  });
});
