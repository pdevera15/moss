import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export const mossHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--color-moss-dark)", fontWeight: "bold" },
  { tag: tags.string, color: "var(--color-amber)" },
  { tag: tags.comment, color: "var(--color-text-muted)", fontStyle: "italic" },
  { tag: [tags.number, tags.bool], color: "var(--color-moss)" },
  { tag: [tags.operator, tags.punctuation], color: "var(--color-text-muted)" },
  { tag: [tags.typeName, tags.className], color: "var(--color-moss-light)" },
]);

export function getMossHighlighting() {
  return syntaxHighlighting(mossHighlightStyle);
}
