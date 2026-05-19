import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CodeMirror static CSS", () => {
  const appCss = readFileSync(resolve("src/app.css"), "utf8");

  it("keeps overlay layers out of editor flex layout when CM dynamic styles are unavailable", () => {
    expect(appCss).toContain(".cm-editor .cm-layer");
    expect(appCss).toContain("position: absolute");
    expect(appCss).toContain("z-index: 0");
    expect(appCss).toContain(".cm-editor .cm-cursorLayer");
    expect(appCss).toContain(".cm-editor .cm-selectionLayer");
    expect(appCss).toContain(".cm-editor.cm-focused > .cm-scroller > .cm-cursorLayer .cm-cursor");
  });

  it("hides the native focused caret so only the styled CodeMirror cursor is visible", () => {
    expect(appCss).toContain(".cm-editor.cm-focused .cm-content");
    expect(appCss).toContain(".cm-editor.cm-focused .cm-line");
    expect(appCss).toContain("caret-color: transparent !important");
    expect(appCss).toContain("border-left: var(--editor-cursor-width) solid var(--color-amber) !important");
  });

  it("keeps rendered tables and blockquotes aligned with editor text", () => {
    expect(appCss).toContain("--editor-line-padding: var(--space-16)");
    expect(appCss).toContain("--editor-block-padding: calc(var(--editor-line-padding) + var(--space-3))");
    expect(appCss).toContain(".cm-editor .cm-moss-blockquote");
    expect(appCss).toContain("padding-left: var(--editor-block-padding) !important");
    expect(appCss).toContain(".cm-editor .cm-moss-table-wrapper");
    expect(appCss).toContain("margin: var(--space-3) var(--editor-line-padding)");
  });

  it("mirrors CodeMirror content and line wrapping base rules statically", () => {
    expect(appCss).toContain(".cm-editor .cm-content");
    expect(appCss).toContain("display: block");
    expect(appCss).toContain("box-sizing: border-box");
    expect(appCss).toContain("outline: none");
    expect(appCss).toContain("-webkit-user-modify: read-write-plaintext-only");
    expect(appCss).toContain(".cm-editor .cm-lineWrapping");
    expect(appCss).toContain("white-space: break-spaces");
    expect(appCss).toContain("flex-shrink: 1");
  });

  it("includes static support for CodeMirror accessory elements", () => {
    expect(appCss).toContain(".cm-editor .cm-announced");
    expect(appCss).toContain(".cm-editor .cm-specialChar");
    expect(appCss).toContain(".cm-editor .cm-gutter");
    expect(appCss).toContain(".cm-editor .cm-panels");
    expect(appCss).toContain(".cm-editor .cm-dialog");
  });
});
