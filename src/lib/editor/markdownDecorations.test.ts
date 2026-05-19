import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { Strikethrough, Table } from "@lezer/markdown";
import { markdownDecorations } from "./markdownDecorations";

function makeView(doc: string): EditorView {
  const state = EditorState.create({
    doc,
    extensions: [markdown(), markdownDecorations],
  });
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  return new EditorView({ state, parent });
}

describe("markdownDecorations", () => {
  it("mounts without throwing", () => {
    expect(() => makeView("Hello world")).not.toThrow();
  });
  it("mounts with heading syntax without throwing", () => {
    expect(() => makeView("# Hello\n\nSome text")).not.toThrow();
  });
  it("mounts with bold syntax without throwing", () => {
    expect(() => makeView("This is **bold** text")).not.toThrow();
  });
  it("mounts with italic syntax without throwing", () => {
    expect(() => makeView("This is _italic_ text")).not.toThrow();
  });
  it("mounts with inline code without throwing", () => {
    expect(() => makeView("Use `code` here")).not.toThrow();
  });
  it("mounts with a link without throwing", () => {
    expect(() => makeView("[Moss](https://example.com)")).not.toThrow();
  });
  it("mounts with strikethrough syntax without throwing", () => {
    const state = EditorState.create({
      doc: "~~done~~",
      extensions: [
        markdown({ extensions: [Strikethrough] }),
        markdownDecorations,
      ],
    });
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    expect(() => new EditorView({ state, parent })).not.toThrow();
  });
  it("mounts with ordered list syntax without throwing", () => {
    expect(() => makeView("1. First\n2. Second\n3. Third")).not.toThrow();
  });
  it("mounts with horizontal rule without throwing", () => {
    expect(() => makeView("Above\n\n---\n\nBelow")).not.toThrow();
  });
  it("moves the cursor into rendered table markdown when the table is clicked", () => {
    const tableMarkdown = "| Name | Value |\n| --- | --- |\n| Moss | Warm |";
    const doc = `${tableMarkdown}\n\nBelow`;
    const state = EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [markdown({ extensions: [Table] }), markdownDecorations],
    });
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const view = new EditorView({ state, parent });
    const table = parent.querySelector(".cm-moss-table-wrapper");

    expect(table).not.toBeNull();
    table!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(view.state.selection.main.head).toBe(0);
    expect(parent.querySelector(".cm-moss-table-wrapper")).toBeNull();
  });
});
