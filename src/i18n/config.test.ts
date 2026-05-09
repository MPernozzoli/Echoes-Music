import { describe, expect, it } from "vitest";
import { resolveUiLanguage } from "./config";

describe("resolveUiLanguage", () => {
  it("uses a stored supported language first", () => {
    expect(resolveUiLanguage("it", ["fr-FR", "en-US"])).toBe("it");
  });

  it("uses the first supported browser preference", () => {
    expect(resolveUiLanguage(null, ["nl-NL", "de-DE", "en-US"])).toBe("de");
  });

  it("supports a single navigator language value", () => {
    expect(resolveUiLanguage(null, "pt-BR")).toBe("pt");
  });

  it("falls back to English for unsupported preferences", () => {
    expect(resolveUiLanguage(null, ["nl-NL", "sv-SE"])).toBe("en");
  });
});
