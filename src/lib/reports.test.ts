import { describe, it, expect } from "vitest";
import { detectOffPlatform } from "./reports";

describe("detectOffPlatform", () => {
  it("flags external messenger names and links", () => {
    expect(detectOffPlatform("напиши мне в telegram")).toBe(true);
    expect(detectOffPlatform("my whatsapp is better")).toBe(true);
    expect(detectOffPlatform("пиши у Viber")).toBe(true);
    expect(detectOffPlatform("ось посилання t.me/someuser")).toBe(true);
    expect(detectOffPlatform("wa.me/380501234567")).toBe(true);
  });

  it("flags long digit runs (phone / card numbers)", () => {
    expect(detectOffPlatform("+38 (050) 123-45-67")).toBe(true);
    expect(detectOffPlatform("карта 4111 1111 1111 1111")).toBe(true);
    expect(detectOffPlatform("0501234567")).toBe(true);
  });

  it("does NOT flag ordinary deal chatter (low false-positive)", () => {
    expect(detectOffPlatform("Дякую, домовились на 100 євро")).toBe(false);
    expect(detectOffPlatform("Коли буде готово?")).toBe(false);
    expect(detectOffPlatform("Order #42 is ready")).toBe(false);
    expect(detectOffPlatform("Зустрінемось о 15:30")).toBe(false);
    expect(detectOffPlatform("")).toBe(false);
    expect(detectOffPlatform(null)).toBe(false);
    expect(detectOffPlatform(undefined)).toBe(false);
  });
});
