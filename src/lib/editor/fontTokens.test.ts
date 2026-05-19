import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("font tokens", () => {
  const appCss = readFileSync(resolve("src/app.css"), "utf8");

  it("prefers Avenir Next for prose and UI sans text while preserving existing fallbacks", () => {
    expect(appCss).toContain(
      '--font-title: "Avenir Next", "Inter Variable"',
    );
    expect(appCss).toContain('--font-body:  "Avenir Next", "Inter Variable"');
    expect(appCss).toContain('--font-sans:  "Avenir Next", "Inter Variable"');
    expect(appCss).toContain('--font-mono:  "GeistMono"');
  });
});
