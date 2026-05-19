import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("font tokens", () => {
  const appCss = readFileSync(resolve("src/app.css"), "utf8");
  const block = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return appCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"))?.[1] ?? "";
  };
  const tokenValue = (css: string, token: string) =>
    css.match(new RegExp(`--font-${token}:\\s+([^;]+);`))?.[1].trim();

  it("prefers Avenir Next for prose and UI sans text while preserving existing fallbacks", () => {
    expect(appCss).toContain(
      '--font-title: "Avenir Next", "Inter Variable"',
    );
    expect(appCss).toContain('--font-body:  "Avenir Next", "Inter Variable"');
    expect(appCss).toContain('--font-sans:  "Avenir Next", "Inter Variable"');
    expect(appCss).toContain('--font-mono:  "GeistMono"');
  });

  it("keeps Tailwind font theme tokens mirrored with runtime CSS variables", () => {
    const themeCss = block("@theme");
    const rootCss = block(":root");

    for (const token of ["title", "body", "sans", "mono"]) {
      expect(tokenValue(themeCss, token), `--font-${token} drifted`).toBe(
        tokenValue(rootCss, token),
      );
    }
  });
});
