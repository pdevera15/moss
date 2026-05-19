import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CodeMirror static CSS", () => {
  const appCss = readFileSync(resolve("src/app.css"), "utf8");

  it("keeps overlay layers out of editor flex layout when CM dynamic styles are unavailable", () => {
    expect(appCss).toContain(".cm-editor .cm-layer");
    expect(appCss).toContain("position: absolute");
    expect(appCss).toContain(".cm-editor .cm-cursorLayer");
    expect(appCss).toContain(".cm-editor .cm-selectionLayer");
    expect(appCss).toContain(".cm-editor.cm-focused > .cm-scroller > .cm-cursorLayer .cm-cursor");
  });
});
