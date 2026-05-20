import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Editor cursor setup", () => {
  const editorSource = readFileSync(
    resolve("src/lib/components/Editor/Editor.svelte"),
    "utf8",
  );

  it("enables CodeMirror drawSelection when static CSS hides the native caret", () => {
    expect(editorSource).toContain("drawSelection");
    expect(editorSource).toContain("drawSelection()");
  });
});
