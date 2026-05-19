import {
  ViewPlugin,
  Decoration,
  type ViewUpdate,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { RangeSetBuilder, StateField, EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

class BulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.textContent = "•";
    span.className = "cm-moss-bullet";
    return span;
  }
  eq(): boolean {
    return true;
  }
  // Return false so CM6 handles pointer events (positions cursor) instead of
  // swallowing them — the default ignoreEvent() returns true which made clicking
  // on a bullet not register in the editor.
  ignoreEvent(): boolean {
    return false;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly pos: number,
  ) {
    super();
  }
  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement("span");
    span.className =
      "cm-moss-checkbox" + (this.checked ? " cm-moss-checkbox-checked" : "");
    span.setAttribute("aria-checked", String(this.checked));
    span.setAttribute("role", "checkbox");
    span.addEventListener("mousedown", (e) => {
      e.preventDefault();
      view.dispatch({
        changes: {
          from: this.pos,
          to: this.pos + 3,
          insert: this.checked ? "[ ]" : "[x]",
        },
      });
    });
    return span;
  }
  eq(other: CheckboxWidget): boolean {
    return this.checked === other.checked && this.pos === other.pos;
  }
  ignoreEvent(e: Event) {
    return e.type === "mousedown";
  }
}

const LANG_NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  rs: "Rust",
  rust: "Rust",
  go: "Go",
  java: "Java",
  kt: "Kotlin",
  kotlin: "Kotlin",
  swift: "Swift",
  cs: "C#",
  cpp: "C++",
  c: "C",
  rb: "Ruby",
  ruby: "Ruby",
  php: "PHP",
  dart: "Dart",
  svelte: "Svelte",
  vue: "Vue",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sh: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  sql: "SQL",
  md: "Markdown",
  xml: "XML",
};

function displayLang(raw: string): string {
  const key = raw.toLowerCase();
  return LANG_NAMES[key] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}

class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
  ) {
    super();
  }
  toDOM(): HTMLElement {
    if (this.src.startsWith("/") || this.src.startsWith(".")) {
      const img = document.createElement("img");
      img.src = this.src;
      img.alt = this.alt;
      img.className = "cm-moss-image";
      return img;
    }
    const span = document.createElement("span");
    span.className = "cm-moss-image-placeholder";
    span.textContent = `[img: ${this.alt}]`;
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", this.alt);
    return span;
  }
  eq(other: ImageWidget): boolean {
    return this.src === other.src && this.alt === other.alt;
  }
}

const cls = {
  h1: Decoration.line({ class: "cm-moss-h1" }),
  h2: Decoration.line({ class: "cm-moss-h2" }),
  h3: Decoration.line({ class: "cm-moss-h3" }),
  bold: Decoration.mark({ class: "cm-moss-bold" }),
  italic: Decoration.mark({ class: "cm-moss-italic" }),
  strikethrough: Decoration.mark({ class: "cm-moss-strikethrough" }),
  code: Decoration.mark({ class: "cm-moss-code" }),
  link: Decoration.mark({ class: "cm-moss-link" }),
  blockquote: Decoration.line({ class: "cm-moss-blockquote" }),
  orderedMark: Decoration.mark({ class: "cm-moss-ordered-mark" }),
  listItem: Decoration.line({ class: "cm-moss-list-item" }),
  tag: Decoration.mark({ class: "cm-moss-tag" }),
  hidden: Decoration.replace({}),
  hrLine: Decoration.line({ class: "cm-moss-hr" }),
  fencedLine: Decoration.line({ class: "cm-moss-fenced-line" }),
  fenceClose: Decoration.line({ class: "cm-moss-fence-close" }),
};

// Matches #tag and #nested/tag — must start with a letter, no spaces.
// A leading space or start-of-line + space before # is fine; what matters
// is that the character immediately after # is not a space (which would
// make it a heading mark instead).
const TAG_RE = /(?<![&\w])#(\p{L}[\p{L}\p{N}_\-/]*)/gu;

// ── Callout blocks ────────────────────────────────────────────────────────────

interface CalloutMeta {
  label: string;
  variant:
    | "info"
    | "tip"
    | "success"
    | "warning"
    | "danger"
    | "example"
    | "quote";
  icon: string;
}

const CALLOUT_MAP: Record<string, CalloutMeta> = {
  note: { label: "Note", variant: "info", icon: "ℹ" },
  abstract: { label: "Abstract", variant: "info", icon: "≡" },
  summary: { label: "Summary", variant: "info", icon: "≡" },
  tldr: { label: "TL;DR", variant: "info", icon: "≡" },
  info: { label: "Info", variant: "info", icon: "ℹ" },
  todo: { label: "To-Do", variant: "info", icon: "○" },
  tip: { label: "Tip", variant: "tip", icon: "✦" },
  hint: { label: "Hint", variant: "tip", icon: "✦" },
  important: { label: "Important", variant: "tip", icon: "✦" },
  success: { label: "Success", variant: "success", icon: "✓" },
  check: { label: "Check", variant: "success", icon: "✓" },
  done: { label: "Done", variant: "success", icon: "✓" },
  question: { label: "Question", variant: "warning", icon: "?" },
  help: { label: "Help", variant: "warning", icon: "?" },
  faq: { label: "FAQ", variant: "warning", icon: "?" },
  warning: { label: "Warning", variant: "warning", icon: "⚠" },
  caution: { label: "Caution", variant: "warning", icon: "⚠" },
  attention: { label: "Attention", variant: "warning", icon: "⚠" },
  failure: { label: "Failure", variant: "danger", icon: "✕" },
  fail: { label: "Fail", variant: "danger", icon: "✕" },
  missing: { label: "Missing", variant: "danger", icon: "✕" },
  danger: { label: "Danger", variant: "danger", icon: "⚡" },
  error: { label: "Error", variant: "danger", icon: "✕" },
  bug: { label: "Bug", variant: "danger", icon: "⚠" },
  example: { label: "Example", variant: "example", icon: "◈" },
  quote: { label: "Quote", variant: "quote", icon: "❝" },
  cite: { label: "Cite", variant: "quote", icon: "❝" },
};

const CALLOUT_HEADER_RE = /^> \[!(\w+)\](?:[ \t](.+))?$/;

interface CalloutLineData {
  variant: string;
  pos: "first" | "mid" | "last" | "only";
  // set only on the header line
  replaceLen?: number;
  icon?: string;
  label?: string;
}

class CalloutHeaderWidget extends WidgetType {
  constructor(
    readonly icon: string,
    readonly label: string,
    readonly variant: string,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = `cm-moss-callout-type cm-moss-callout-type-${this.variant}`;
    const iconEl = document.createElement("span");
    iconEl.setAttribute("aria-hidden", "true");
    iconEl.textContent = this.icon + " ";
    span.appendChild(iconEl);
    span.appendChild(document.createTextNode(this.label));
    return span;
  }

  eq(other: CalloutHeaderWidget): boolean {
    return (
      this.icon === other.icon &&
      this.label === other.label &&
      this.variant === other.variant
    );
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;

  // Hide markers unless the cursor is on the same line as the mark.
  function onCursorLine(pos: number): boolean {
    const lineNum = state.doc.lineAt(pos).number;
    for (const range of state.selection.ranges) {
      const fromLine = state.doc.lineAt(range.from).number;
      const toLine = state.doc.lineAt(range.to).number;
      if (lineNum >= fromLine && lineNum <= toLine) return true;
    }
    return false;
  }

  // ── Pre-scan entire document for callout blocks ───────────────────────────
  // Must happen before the syntax-tree walk so Blockquote/QuoteMark nodes can
  // detect they are part of a callout and skip their default decoration.
  const calloutLineData = new Map<number, CalloutLineData>();
  const calloutCursorBlocks = new Set<number>(); // line numbers whose block has cursor

  for (let scanLn = 1; scanLn <= state.doc.lines; ) {
    const line = state.doc.line(scanLn);
    const m = CALLOUT_HEADER_RE.exec(line.text);
    if (!m) {
      scanLn++;
      continue;
    }

    const rawType = m[1].toLowerCase();
    const customTitle = m[2]?.trim() ?? "";
    const meta = CALLOUT_MAP[rawType] ?? {
      label: rawType.charAt(0).toUpperCase() + rawType.slice(1),
      variant: "info" as const,
      icon: "ℹ",
    };

    const bodyLineNums: number[] = [];
    let next = scanLn + 1;
    while (next <= state.doc.lines) {
      const t = state.doc.line(next).text;
      if (t === ">" || t.startsWith("> ")) {
        bodyLineNums.push(next);
        next++;
      } else break;
    }
    // Trim trailing empty body lines (auto-continued "> " lines from markdown extension)
    while (bodyLineNums.length > 0) {
      const t = state.doc.line(bodyLineNums[bodyLineNums.length - 1]).text;
      if (t === ">" || t === "> ") bodyLineNums.pop();
      else break;
    }

    const endLn =
      bodyLineNums.length > 0 ? bodyLineNums[bodyLineNums.length - 1] : scanLn;
    const hasBody = bodyLineNums.length > 0;

    let blockHasCursor = false;
    for (let l = scanLn; l <= endLn; l++) {
      if (onCursorLine(state.doc.line(l).from)) {
        blockHasCursor = true;
        break;
      }
    }
    if (blockHasCursor) {
      for (let l = scanLn; l <= endLn; l++) calloutCursorBlocks.add(l);
    }

    calloutLineData.set(scanLn, {
      variant: meta.variant,
      pos: hasBody ? "first" : "only",
      icon: meta.icon,
      label: customTitle || meta.label,
    });
    for (let i = 0; i < bodyLineNums.length; i++) {
      calloutLineData.set(bodyLineNums[i], {
        variant: meta.variant,
        pos: i === bodyLineNums.length - 1 ? "last" : "mid",
      });
    }

    scanLn = endLn + 1;
  }

  // Collect all entries before adding to the builder.
  // The syntax tree visits parents before children. When a parent node (e.g.
  // StrongEmphasis) and its child (EmphasisMark) share the same `from` position,
  // the parent's Decoration.mark (startSide=0) is collected before the child's
  // Decoration.replace (startSide=-1). RangeSetBuilder requires ascending
  // (from, startSide) order, so we sort after collecting.
  const entries: Array<[number, number, Decoration]> = [];

  function hideOrMute(from: number, to: number): void {
    if (!onCursorLine(from)) entries.push([from, to, cls.hidden]);
  }

  syntaxTree(state).iterate({
    from: view.viewport.from,
    to: view.viewport.to,
    enter(node) {
      const { from, to, name } = node;

      switch (name) {
        case "ATXHeading1":
        case "ATXHeading2":
        case "ATXHeading3":
          break;
        case "HeaderMark": {
          // +1 to include the space after #, clamped to line end
          const lineEnd = state.doc.lineAt(from).to;
          hideOrMute(from, Math.min(to + 1, lineEnd));
          break;
        }
        case "StrongEmphasis":
          if (!onCursorLine(from)) entries.push([from, to, cls.bold]);
          break;
        case "Emphasis":
          if (!onCursorLine(from)) entries.push([from, to, cls.italic]);
          break;
        case "EmphasisMark":
          hideOrMute(from, to);
          break;
        case "InlineCode":
          if (!onCursorLine(from)) entries.push([from, to, cls.code]);
          break;
        case "CodeMark":
          if (to - from < 3) hideOrMute(from, to);
          break;
        case "Strikethrough":
          if (!onCursorLine(from)) entries.push([from, to, cls.strikethrough]);
          break;
        case "StrikethroughMark":
          hideOrMute(from, to);
          break;
        case "FencedCode": {
          const firstLine = state.doc.lineAt(from);
          const lastLine = state.doc.lineAt(Math.max(from, to - 1));
          // Reveal raw fence markers when cursor is anywhere inside the block
          const cursorInBlock = state.selection.ranges.some((range) => {
            const ln = state.doc.lineAt(range.from).number;
            return ln >= firstLine.number && ln <= lastLine.number;
          });
          // Opening fence line always gets background
          entries.push([firstLine.from, firstLine.from, cls.fencedLine]);
          if (!cursorInBlock) {
            let rawLang = "";
            for (
              let child = node.node.firstChild;
              child;
              child = child.nextSibling
            ) {
              if (child.name === "CodeInfo") {
                rawLang = state.doc.sliceString(child.from, child.to).trim();
                break;
              }
            }
            const label = rawLang ? displayLang(rawLang) : "";
            entries.push([
              firstLine.from,
              firstLine.from,
              Decoration.line({
                class: "cm-moss-fence-open",
                attributes: label ? { "data-lang": label } : {},
              }),
            ]);
          }
          // Content lines always get the fenced background
          for (let ln = firstLine.number + 1; ln < lastLine.number; ln++) {
            const cl = state.doc.line(ln);
            entries.push([cl.from, cl.from, cls.fencedLine]);
          }
          // Closing fence line always gets background; collapse when cursor not in block
          if (lastLine.number !== firstLine.number) {
            entries.push([lastLine.from, lastLine.from, cls.fencedLine]);
            if (
              !cursorInBlock &&
              /^[ \t]*(```+|~~~+)[ \t]*$/.test(lastLine.text)
            ) {
              entries.push([lastLine.from, lastLine.from, cls.fenceClose]);
            }
          }
          break;
        }
        case "Link": {
          if (/^> \[!/.test(state.doc.lineAt(from).text)) break;
          if (!onCursorLine(from)) entries.push([from, to, cls.link]);
          break;
        }
        case "Image": {
          if (!onCursorLine(from)) {
            // Extract URL from the URL child node to avoid capturing an optional title attribute.
            let src = "";
            for (
              let child = node.node.firstChild;
              child;
              child = child.nextSibling
            ) {
              if (child.name === "URL") {
                src = state.doc.sliceString(child.from, child.to).trim();
                break;
              }
            }
            const raw = state.doc.sliceString(from, to);
            const altMatch = raw.match(/^!\[([^\]]*)\]/);
            const alt = altMatch ? altMatch[1] : "";
            if (src)
              entries.push([
                from,
                to,
                Decoration.replace({ widget: new ImageWidget(src, alt) }),
              ]);
          }
          break;
        }
        case "LinkMark": {
          // Skip marks that are children of an Image — the Image node is replaced wholesale
          if (node.node.parent?.name === "Image") break;
          // Don't style/hide [!TYPE] brackets on callout header lines
          if (/^> \[!/.test(state.doc.lineAt(from).text)) break;
          // Don't hide [ or ] that belong to a task marker pattern [ ] / [x]
          const ch = state.doc.sliceString(from, to);
          if (ch === "[") {
            const snip = state.doc.sliceString(from, from + 3);
            if (snip === "[ ]" || snip === "[x]" || snip === "[X]") break;
          } else if (ch === "]") {
            const snip = state.doc.sliceString(Math.max(0, from - 2), from + 1);
            if (snip === "[ ]" || snip === "[x]" || snip === "[X]") break;
          }
          hideOrMute(from, to);
          break;
        }
        case "URL": {
          if (node.node.parent?.name !== "Image") {
            if (!/^> \[!/.test(state.doc.lineAt(from).text))
              hideOrMute(from, to);
          }
          break;
        }
        case "ListMark": {
          const markText = state.doc.sliceString(from, to);
          if (/^\d+[.)]$/.test(markText)) {
            // Ordered list: style the number
            entries.push([from, to, cls.orderedMark]);
          } else {
            // Unordered list: replace `-`/`*`/`+` + trailing space with a bullet
            // widget. ignoreEvent() returns false on BulletWidget so clicks still
            // reach CM6 and position the cursor correctly.
            const lineStart = state.doc.lineAt(from).from;
            const lineEnd = state.doc.lineAt(from).to;
            entries.push([lineStart, lineStart, cls.listItem]);
            entries.push([
              from,
              Math.min(to + 1, lineEnd),
              Decoration.replace({ widget: new BulletWidget() }),
            ]);
          }
          break;
        }
        case "Blockquote": {
          const firstLineNum = state.doc.lineAt(from).number;
          if (calloutLineData.has(firstLineNum)) break;
          const lastLineNum = state.doc.lineAt(to).number;
          for (let ln = firstLineNum; ln <= lastLineNum; ln++) {
            if (!calloutLineData.has(ln)) {
              const line = state.doc.line(ln);
              entries.push([line.from, line.from, cls.blockquote]);
            }
          }
          break;
        }
        case "QuoteMark": {
          if (calloutLineData.has(state.doc.lineAt(from).number)) break;
          hideOrMute(from, to);
          break;
        }
      }
    },
  });

  // Scan visible lines for #tag tokens (# immediately followed by a letter).
  const { from: vpFrom, to: vpTo } = view.viewport;
  const visibleText = state.doc.sliceString(vpFrom, vpTo);
  TAG_RE.lastIndex = 0;
  for (const match of visibleText.matchAll(TAG_RE)) {
    const from = vpFrom + match.index!;
    const to = from + match[0].length;
    entries.push([from, to, cls.tag]);
  }

  // Scan for [ ] / [x] checkboxes at line start (with optional leading whitespace or `- `).
  const CHECKBOX_RE = /^[ \t]*(?:[-*+] )?(\[[ xX]\])/gm;
  CHECKBOX_RE.lastIndex = 0;
  for (const match of visibleText.matchAll(CHECKBOX_RE)) {
    const markerFrom = vpFrom + match.index! + match[0].length - 3;
    const markerTo = markerFrom + 3;
    const checked = match[1] !== "[ ]";
    if (!onCursorLine(markerFrom)) {
      entries.push([
        markerFrom,
        markerTo,
        Decoration.replace({ widget: new CheckboxWidget(checked, markerFrom) }),
      ]);
    }
  }

  // ── Callout line decorations ─────────────────────────────────────────────
  // Each callout line gets a line-class decoration (background + left border)
  // and — when the cursor is not inside the block — an inline replacement that
  // hides the raw `> [!TYPE] Title` / `> ` prefixes.
  for (const [lineNum, data] of calloutLineData) {
    const line = state.doc.line(lineNum);
    // Skip lines outside the current viewport
    if (line.from > view.viewport.to || line.to < view.viewport.from) continue;

    if (calloutCursorBlocks.has(lineNum)) continue;

    entries.push([
      line.from,
      line.from,
      Decoration.line({
        class: `cm-moss-callout-line cm-moss-callout-${data.pos} cm-moss-callout-line-${data.variant}`,
      }),
    ]);

    {
      if (data.pos === "first" || data.pos === "only") {
        // Replace the entire `> [!TYPE] Title` line content with the header widget
        entries.push([
          line.from,
          line.to,
          Decoration.replace({
            widget: new CalloutHeaderWidget(
              data.icon!,
              data.label!,
              data.variant,
            ),
          }),
        ]);
      } else {
        // Hide the `> ` prefix so only the body text is visible
        const prefixEnd = line.text.startsWith("> ")
          ? line.from + 2
          : line.from + 1;
        entries.push([line.from, prefixEnd, cls.hidden]);
      }
    }
  }

  entries.sort((a, b) => a[0] - b[0] || a[2].startSide - b[2].startSide);

  const builder = new RangeSetBuilder<Decoration>();
  for (const [from, to, dec] of entries) {
    builder.add(from, to, dec);
  }
  return builder.finish();
}

const inlineDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

function buildHRDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const cursorLines = new Set<number>();
  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from).number;
    const toLine = state.doc.lineAt(range.to).number;
    for (let ln = fromLine; ln <= toLine; ln++) cursorLines.add(ln);
  }

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "HorizontalRule") return;
      const line = state.doc.lineAt(node.from);
      if (cursorLines.has(line.number)) return;
      builder.add(line.from, line.from, cls.hrLine);
      builder.add(node.from, node.to, cls.hidden);
    },
  });

  return builder.finish();
}

const hrDecorations = StateField.define<DecorationSet>({
  create(state) {
    return buildHRDecorations(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) return buildHRDecorations(tr.state);
    return deco;
  },
  provide(f) {
    return EditorView.decorations.from(f);
  },
});

function buildHeadingDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  syntaxTree(state).iterate({
    enter(node) {
      switch (node.name) {
        case "ATXHeading1":
          builder.add(node.from, node.from, cls.h1);
          break;
        case "ATXHeading2":
          builder.add(node.from, node.from, cls.h2);
          break;
        case "ATXHeading3":
          builder.add(node.from, node.from, cls.h3);
          break;
      }
    },
  });

  return builder.finish();
}

const headingDecorations = StateField.define<DecorationSet>({
  create(state) {
    return buildHeadingDecorations(state);
  },
  update(deco, tr) {
    if (tr.docChanged) return buildHeadingDecorations(tr.state);
    return deco;
  },
  provide(f) {
    return EditorView.decorations.from(f);
  },
});

// ── Tables (GFM) ─────────────────────────────────────────────────────────────
// When the cursor is outside the Table block, the raw `| a | b |` lines are
// replaced wholesale with a rendered HTML table. Editing the source brings the
// raw markdown back, mirroring how FencedCode toggles open/closed.

type Align = "left" | "center" | "right" | null;

function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && s[i + 1] === "|") {
      buf += "|";
      i++;
      continue;
    }
    if (ch === "|") {
      cells.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  cells.push(buf.trim());
  return cells;
}

function parseAlignments(delimLine: string): Align[] {
  return splitTableRow(delimLine).map((c) => {
    const left = c.startsWith(":");
    const right = c.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    if (left) return "left";
    return null;
  });
}

// Inline parsing limited to what's safe to render via DOM construction:
// code, bold, italic, strikethrough, links. No innerHTML — text is set via
// textContent and `href` is sanitized against javascript: URLs.
const INLINE_RE =
  /(`+)([^`]+?)\1|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|(?<!\w)_([^_\n]+)_(?!\w)|~~([^~\n]+)~~|\[([^\]]+)\]\(([^)\s]+)\)/g;

function renderInline(parent: HTMLElement, text: string): void {
  INLINE_RE.lastIndex = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last)
      parent.appendChild(document.createTextNode(text.slice(last, m.index)));
    if (m[1]) {
      const code = document.createElement("code");
      code.className = "cm-moss-code";
      code.textContent = m[2];
      parent.appendChild(code);
    } else if (m[3] !== undefined || m[4] !== undefined) {
      const b = document.createElement("strong");
      b.textContent = (m[3] ?? m[4])!;
      parent.appendChild(b);
    } else if (m[5] !== undefined || m[6] !== undefined) {
      const i = document.createElement("em");
      i.textContent = (m[5] ?? m[6])!;
      parent.appendChild(i);
    } else if (m[7] !== undefined) {
      const s = document.createElement("s");
      s.className = "cm-moss-strikethrough";
      s.textContent = m[7];
      parent.appendChild(s);
    } else if (m[8] !== undefined && m[9] !== undefined) {
      const a = document.createElement("a");
      const url = m[9].trim();
      if (!/^\s*javascript:/i.test(url)) a.href = url;
      a.textContent = m[8];
      a.className = "cm-moss-link";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      parent.appendChild(a);
    }
    last = INLINE_RE.lastIndex;
  }
  if (last < text.length)
    parent.appendChild(document.createTextNode(text.slice(last)));
}

class TableWidget extends WidgetType {
  constructor(
    readonly source: string,
    readonly sourceFrom: number,
  ) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-moss-table-wrapper";
    wrapper.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      view.dispatch({
        selection: { anchor: this.sourceFrom },
      });
    });

    const lines = this.source.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      wrapper.textContent = this.source;
      return wrapper;
    }

    const headerCells = splitTableRow(lines[0]);
    const aligns = parseAlignments(lines[1]);
    const bodyRows = lines.slice(2).map(splitTableRow);

    const table = document.createElement("table");
    table.className = "cm-moss-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerCells.forEach((cell, i) => {
      const th = document.createElement("th");
      const a = aligns[i];
      if (a) th.style.textAlign = a;
      renderInline(th, cell);
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    if (bodyRows.length > 0) {
      const tbody = document.createElement("tbody");
      bodyRows.forEach((cells) => {
        const tr = document.createElement("tr");
        // Pad short rows so column count matches the header
        const n = Math.max(cells.length, headerCells.length);
        for (let i = 0; i < n; i++) {
          const td = document.createElement("td");
          const a = aligns[i];
          if (a) td.style.textAlign = a;
          renderInline(td, cells[i] ?? "");
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
    }

    wrapper.appendChild(table);
    return wrapper;
  }

  eq(other: TableWidget): boolean {
    return this.source === other.source && this.sourceFrom === other.sourceFrom;
  }
}

function buildTableDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const cursorLines = new Set<number>();
  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from).number;
    const toLine = state.doc.lineAt(range.to).number;
    for (let ln = fromLine; ln <= toLine; ln++) cursorLines.add(ln);
  }

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "Table") return;
      const firstLine = state.doc.lineAt(node.from);
      const lastLine = state.doc.lineAt(node.to);
      for (let ln = firstLine.number; ln <= lastLine.number; ln++) {
        if (cursorLines.has(ln)) return false;
      }
      const source = state.doc.sliceString(firstLine.from, lastLine.to);
      const end =
        lastLine.number < state.doc.lines ? lastLine.to + 1 : lastLine.to;
      builder.add(
        firstLine.from,
        end,
        Decoration.replace({
          widget: new TableWidget(source, firstLine.from),
          block: true,
        }),
      );
      return false;
    },
  });
  return builder.finish();
}

const tableDecorations = StateField.define<DecorationSet>({
  create(state) {
    return buildTableDecorations(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) return buildTableDecorations(tr.state);
    return deco;
  },
  provide(f) {
    return EditorView.decorations.from(f);
  },
});

export const markdownDecorations = [
  headingDecorations,
  inlineDecorations,
  hrDecorations,
  tableDecorations,
];
