import { describe, it, expect } from "vitest";
import {
  normalizeCode,
  metaFor,
  symbolFor,
  rateOf,
  toEur,
  fromEur,
  convertAmount,
  formatMoney,
  formatMinor,
  type FxRate,
} from "./money";

const RATES: FxRate[] = [
  { code: "usd", rate_per_eur: 1.1, symbol: "$" },
  { code: "uah", rate_per_eur: 45, symbol: "₴" },
];

describe("normalizeCode", () => {
  it("defaults to eur and lowercases/trims", () => {
    expect(normalizeCode(undefined)).toBe("eur");
    expect(normalizeCode(null)).toBe("eur");
    expect(normalizeCode(" USD ")).toBe("usd");
  });
});

describe("metaFor / symbolFor", () => {
  it("returns known metadata", () => {
    expect(metaFor("uah").decimals).toBe(0);
    expect(symbolFor("gbp")).toBe("£");
  });
  it("falls back to the uppercased code for unknown currencies", () => {
    expect(symbolFor("xyz")).toBe("XYZ");
    expect(metaFor("xyz").decimals).toBe(2);
  });
});

describe("rateOf", () => {
  it("is 1 for the base currency", () => {
    expect(rateOf(RATES, "eur")).toBe(1);
  });
  it("reads the rate from the table", () => {
    expect(rateOf(RATES, "USD")).toBe(1.1);
  });
  it("returns null when the rate is missing — never a fabricated multiplier", () => {
    expect(rateOf(RATES, "pln")).toBeNull();
  });
  it("returns null for a non-positive/invalid rate", () => {
    expect(rateOf([{ code: "bad", rate_per_eur: 0, symbol: "x" }], "bad")).toBeNull();
  });
});

describe("conversions", () => {
  it("toEur divides by the rate", () => {
    expect(toEur(110, "usd", RATES)).toBeCloseTo(100);
  });
  it("fromEur multiplies by the rate", () => {
    expect(fromEur(100, "usd", RATES)).toBeCloseTo(110);
  });
  it("propagates null when a rate is missing (honest, not fabricated)", () => {
    expect(toEur(100, "pln", RATES)).toBeNull();
    expect(fromEur(100, "pln", RATES)).toBeNull();
    expect(convertAmount(100, "usd", "pln", RATES)).toBeNull();
  });
  it("cross-converts through EUR", () => {
    // 45 UAH -> 1 EUR -> 1.1 USD
    expect(convertAmount(45, "uah", "usd", RATES)).toBeCloseTo(1.1);
  });
  it("is identity for same-currency", () => {
    expect(convertAmount(50, "usd", "USD", RATES)).toBe(50);
  });
});

describe("formatMoney", () => {
  it("prefixes single-char symbols", () => {
    expect(formatMoney(10, "eur", { localeTag: "en-GB" })).toBe("€10.00");
  });
  it("suffixes multi-char symbols", () => {
    expect(formatMoney(10, "pln", { localeTag: "en-GB" })).toBe("10.00 zł");
  });
  it("honours round and zero-decimal currencies", () => {
    expect(formatMoney(10.6, "uah", { localeTag: "en-GB" })).toBe("₴11");
    expect(formatMoney(10.4, "eur", { localeTag: "en-GB", round: true })).toBe("€10");
  });
  it("treats non-finite amounts as 0 rather than NaN", () => {
    expect(formatMoney(Number.NaN, "eur", { localeTag: "en-GB" })).toBe("€0.00");
  });
});

describe("formatMinor", () => {
  it("converts cents to major units", () => {
    expect(formatMinor(1050, "eur", { localeTag: "en-GB" })).toBe("€10.50");
  });
});
