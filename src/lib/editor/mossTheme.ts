import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Using `class` instead of `color`/`fontWeight` so CM6 adds class names to
// tokens without injecting any dynamic <style> element — Tauri WebView2 drops
// dynamically-injected styles in production builds. The actual colors live in
// app.css as static .cm-moss-tok-* rules.
export const mossHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, class: "cm-moss-tok-keyword" },
  { tag: tags.string, class: "cm-moss-tok-string" },
  { tag: tags.comment, class: "cm-moss-tok-comment" },
  { tag: [tags.number, tags.bool], class: "cm-moss-tok-literal" },
  { tag: [tags.operator, tags.punctuation], class: "cm-moss-tok-operator" },
  { tag: [tags.typeName, tags.className], class: "cm-moss-tok-type" },
]);

export function getMossHighlighting() {
  return syntaxHighlighting(mossHighlightStyle);
}
