import {
  ViewPlugin,
  Decoration,
  type ViewUpdate,
  EditorView,
  WidgetType,
} from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { RangeSetBuilder, StateField, EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

class BulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.textContent = '•'
    span.className = 'cm-moss-bullet'
    return span
  }
  eq(): boolean { return true }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly pos: number) { super() }
  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-moss-checkbox' + (this.checked ? ' cm-moss-checkbox-checked' : '')
    span.setAttribute('aria-checked', String(this.checked))
    span.setAttribute('role', 'checkbox')
    span.addEventListener('mousedown', (e) => {
      e.preventDefault()
      view.dispatch({ changes: { from: this.pos, to: this.pos + 3, insert: this.checked ? '[ ]' : '[x]' } })
    })
    return span
  }
  eq(other: CheckboxWidget): boolean { return this.checked === other.checked && this.pos === other.pos }
  ignoreEvent(e: Event) { return e.type === 'mousedown' }
}

const LANG_NAMES: Record<string, string> = {
  js: 'JavaScript', javascript: 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript',
  jsx: 'JSX', tsx: 'TSX',
  py: 'Python', python: 'Python',
  rs: 'Rust', rust: 'Rust',
  go: 'Go',
  java: 'Java',
  kt: 'Kotlin', kotlin: 'Kotlin',
  swift: 'Swift',
  cs: 'C#', cpp: 'C++', c: 'C',
  rb: 'Ruby', ruby: 'Ruby',
  php: 'PHP',
  dart: 'Dart',
  svelte: 'Svelte', vue: 'Vue',
  html: 'HTML', css: 'CSS', scss: 'SCSS',
  sh: 'Shell', bash: 'Bash', zsh: 'Zsh',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
  sql: 'SQL', md: 'Markdown', xml: 'XML',
}

function displayLang(raw: string): string {
  const key = raw.toLowerCase()
  return LANG_NAMES[key] ?? (raw.charAt(0).toUpperCase() + raw.slice(1))
}

class HRWidget extends WidgetType {
  toDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'cm-moss-hr'
    div.setAttribute('aria-hidden', 'true')
    return div
  }
  eq(): boolean { return true }
}

class ImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string) { super() }
  toDOM(): HTMLElement {
    if (this.src.startsWith('/') || this.src.startsWith('.')) {
      const img = document.createElement('img')
      img.src = this.src
      img.alt = this.alt
      img.className = 'cm-moss-image'
      return img
    }
    const span = document.createElement('span')
    span.className = 'cm-moss-image-placeholder'
    span.textContent = `[img: ${this.alt}]`
    span.setAttribute('role', 'img')
    span.setAttribute('aria-label', this.alt)
    return span
  }
  eq(other: ImageWidget): boolean { return this.src === other.src && this.alt === other.alt }
}

const cls = {
  h1:            Decoration.line({ class: 'cm-moss-h1' }),
  h2:            Decoration.line({ class: 'cm-moss-h2' }),
  h3:            Decoration.line({ class: 'cm-moss-h3' }),
  bold:          Decoration.mark({ class: 'cm-moss-bold' }),
  italic:        Decoration.mark({ class: 'cm-moss-italic' }),
  strikethrough: Decoration.mark({ class: 'cm-moss-strikethrough' }),
  code:          Decoration.mark({ class: 'cm-moss-code' }),
  link:          Decoration.mark({ class: 'cm-moss-link' }),
  blockquote:    Decoration.line({ class: 'cm-moss-blockquote' }),
  marker:        Decoration.mark({ class: 'cm-moss-marker' }),
  orderedMark:   Decoration.mark({ class: 'cm-moss-ordered-mark' }),
  tag:           Decoration.mark({ class: 'cm-moss-tag' }),
  hidden:        Decoration.replace({}),
  fencedLine:    Decoration.line({ class: 'cm-moss-fenced-line' }),
  fenceClose:    Decoration.line({ class: 'cm-moss-fence-close' }),
}

// Matches #tag and #nested/tag — must start with a letter, no spaces.
// A leading space or start-of-line + space before # is fine; what matters
// is that the character immediately after # is not a space (which would
// make it a heading mark instead).
const TAG_RE = /(?<![&\w])#(\p{L}[\p{L}\p{N}_\-/]*)/gu

// ── Callout blocks ────────────────────────────────────────────────────────────

interface CalloutMeta {
  label: string
  variant: 'info' | 'tip' | 'success' | 'warning' | 'danger' | 'example' | 'quote'
  icon: string
}

const CALLOUT_MAP: Record<string, CalloutMeta> = {
  note:      { label: 'Note',      variant: 'info',    icon: 'ℹ' },
  abstract:  { label: 'Abstract',  variant: 'info',    icon: '≡' },
  summary:   { label: 'Summary',   variant: 'info',    icon: '≡' },
  tldr:      { label: 'TL;DR',     variant: 'info',    icon: '≡' },
  info:      { label: 'Info',      variant: 'info',    icon: 'ℹ' },
  todo:      { label: 'To-Do',     variant: 'info',    icon: '○' },
  tip:       { label: 'Tip',       variant: 'tip',     icon: '✦' },
  hint:      { label: 'Hint',      variant: 'tip',     icon: '✦' },
  important: { label: 'Important', variant: 'tip',     icon: '✦' },
  success:   { label: 'Success',   variant: 'success', icon: '✓' },
  check:     { label: 'Check',     variant: 'success', icon: '✓' },
  done:      { label: 'Done',      variant: 'success', icon: '✓' },
  question:  { label: 'Question',  variant: 'warning', icon: '?' },
  help:      { label: 'Help',      variant: 'warning', icon: '?' },
  faq:       { label: 'FAQ',       variant: 'warning', icon: '?' },
  warning:   { label: 'Warning',   variant: 'warning', icon: '⚠' },
  caution:   { label: 'Caution',   variant: 'warning', icon: '⚠' },
  attention: { label: 'Attention', variant: 'warning', icon: '⚠' },
  failure:   { label: 'Failure',   variant: 'danger',  icon: '✕' },
  fail:      { label: 'Fail',      variant: 'danger',  icon: '✕' },
  missing:   { label: 'Missing',   variant: 'danger',  icon: '✕' },
  danger:    { label: 'Danger',    variant: 'danger',  icon: '⚡' },
  error:     { label: 'Error',     variant: 'danger',  icon: '✕' },
  bug:       { label: 'Bug',       variant: 'danger',  icon: '⚠' },
  example:   { label: 'Example',   variant: 'example', icon: '◈' },
  quote:     { label: 'Quote',     variant: 'quote',   icon: '❝' },
  cite:      { label: 'Cite',      variant: 'quote',   icon: '❝' },
}

const CALLOUT_HEADER_RE = /^> \[!(\w+)\](?:[ \t](.+))?$/

interface CalloutLineData {
  variant: string
  pos: 'first' | 'mid' | 'last' | 'only'
  // set only on the header line
  replaceLen?: number
  icon?: string
  label?: string
}

class CalloutHeaderWidget extends WidgetType {
  constructor(
    readonly icon: string,
    readonly label: string,
    readonly variant: string
  ) { super() }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = `cm-moss-callout-type cm-moss-callout-type-${this.variant}`
    const iconEl = document.createElement('span')
    iconEl.setAttribute('aria-hidden', 'true')
    iconEl.textContent = this.icon + ' '
    span.appendChild(iconEl)
    span.appendChild(document.createTextNode(this.label))
    return span
  }

  eq(other: CalloutHeaderWidget): boolean {
    return this.icon === other.icon && this.label === other.label && this.variant === other.variant
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view

  // Hide markers unless the cursor is on the same line as the mark.
  function onCursorLine(pos: number): boolean {
    const lineNum = state.doc.lineAt(pos).number
    for (const range of state.selection.ranges) {
      const fromLine = state.doc.lineAt(range.from).number
      const toLine   = state.doc.lineAt(range.to).number
      if (lineNum >= fromLine && lineNum <= toLine) return true
    }
    return false
  }

  // ── Pre-scan entire document for callout blocks ───────────────────────────
  // Must happen before the syntax-tree walk so Blockquote/QuoteMark nodes can
  // detect they are part of a callout and skip their default decoration.
  const calloutLineData = new Map<number, CalloutLineData>()
  const calloutCursorBlocks = new Set<number>()  // line numbers whose block has cursor

  for (let scanLn = 1; scanLn <= state.doc.lines; ) {
    const line = state.doc.line(scanLn)
    const m = CALLOUT_HEADER_RE.exec(line.text)
    if (!m) { scanLn++; continue }

    const rawType = m[1].toLowerCase()
    const customTitle = m[2]?.trim() ?? ''
    const meta = CALLOUT_MAP[rawType] ?? {
      label: rawType.charAt(0).toUpperCase() + rawType.slice(1),
      variant: 'info' as const,
      icon: 'ℹ',
    }

    const bodyLineNums: number[] = []
    let next = scanLn + 1
    while (next <= state.doc.lines) {
      const t = state.doc.line(next).text
      if (t === '>' || t.startsWith('> ')) { bodyLineNums.push(next); next++ }
      else break
    }
    // Trim trailing empty body lines (auto-continued "> " lines from markdown extension)
    while (bodyLineNums.length > 0) {
      const t = state.doc.line(bodyLineNums[bodyLineNums.length - 1]).text
      if (t === '>' || t === '> ') bodyLineNums.pop()
      else break
    }

    const endLn = bodyLineNums.length > 0 ? bodyLineNums[bodyLineNums.length - 1] : scanLn
    const hasBody = bodyLineNums.length > 0

    let blockHasCursor = false
    for (let l = scanLn; l <= endLn; l++) {
      if (onCursorLine(state.doc.line(l).from)) { blockHasCursor = true; break }
    }
    if (blockHasCursor) {
      for (let l = scanLn; l <= endLn; l++) calloutCursorBlocks.add(l)
    }

    calloutLineData.set(scanLn, {
      variant: meta.variant,
      pos: hasBody ? 'first' : 'only',
      icon: meta.icon,
      label: customTitle || meta.label,
    })
    for (let i = 0; i < bodyLineNums.length; i++) {
      calloutLineData.set(bodyLineNums[i], {
        variant: meta.variant,
        pos: i === bodyLineNums.length - 1 ? 'last' : 'mid',
      })
    }

    scanLn = endLn + 1
  }

  // Collect all entries before adding to the builder.
  // The syntax tree visits parents before children. When a parent node (e.g.
  // StrongEmphasis) and its child (EmphasisMark) share the same `from` position,
  // the parent's Decoration.mark (startSide=0) is collected before the child's
  // Decoration.replace (startSide=-1). RangeSetBuilder requires ascending
  // (from, startSide) order, so we sort after collecting.
  const entries: Array<[number, number, Decoration]> = []

  function hideOrMute(from: number, to: number): void {
    if (!onCursorLine(from)) entries.push([from, to, cls.hidden])
  }

  syntaxTree(state).iterate({
    from: view.viewport.from,
    to:   view.viewport.to,
    enter(node) {
      const { from, to, name } = node

      switch (name) {
        case 'ATXHeading1': entries.push([from, from, cls.h1]); break
        case 'ATXHeading2': entries.push([from, from, cls.h2]); break
        case 'ATXHeading3': entries.push([from, from, cls.h3]); break
        case 'HeaderMark': {
          // +1 to include the space after #, clamped to line end
          const lineEnd = state.doc.lineAt(from).to
          hideOrMute(from, Math.min(to + 1, lineEnd))
          break
        }
        case 'StrongEmphasis': if (!onCursorLine(from)) entries.push([from, to, cls.bold]); break
        case 'Emphasis':       if (!onCursorLine(from)) entries.push([from, to, cls.italic]); break
        case 'EmphasisMark':   hideOrMute(from, to); break
        case 'InlineCode':        if (!onCursorLine(from)) entries.push([from, to, cls.code]); break
        case 'CodeMark':          if (to - from < 3) hideOrMute(from, to); break
        case 'Strikethrough':     if (!onCursorLine(from)) entries.push([from, to, cls.strikethrough]); break
        case 'StrikethroughMark': hideOrMute(from, to); break
        case 'FencedCode': {
          const firstLine = state.doc.lineAt(from)
          const lastLine  = state.doc.lineAt(to)
          // Reveal raw fence markers when cursor is anywhere inside the block
          const cursorInBlock = state.selection.ranges.some(range => {
            const ln = state.doc.lineAt(range.from).number
            return ln >= firstLine.number && ln <= lastLine.number
          })
          // Opening fence line always gets background
          entries.push([firstLine.from, firstLine.from, cls.fencedLine])
          if (!cursorInBlock) {
            let rawLang = ''
            for (let child = node.node.firstChild; child; child = child.nextSibling) {
              if (child.name === 'CodeInfo') { rawLang = state.doc.sliceString(child.from, child.to).trim(); break }
            }
            const label = rawLang ? displayLang(rawLang) : ''
            entries.push([firstLine.from, firstLine.from, Decoration.line({
              class: 'cm-moss-fence-open',
              attributes: label ? { 'data-lang': label } : {},
            })])
          }
          // Content lines always get the fenced background
          for (let ln = firstLine.number + 1; ln < lastLine.number; ln++) {
            const cl = state.doc.line(ln)
            entries.push([cl.from, cl.from, cls.fencedLine])
          }
          // Closing fence line always gets background; collapse when cursor not in block
          if (lastLine.number !== firstLine.number) {
            entries.push([lastLine.from, lastLine.from, cls.fencedLine])
            if (!cursorInBlock) entries.push([lastLine.from, lastLine.from, cls.fenceClose])
          }
          break
        }
        case 'Link': {
          if (/^> \[!/.test(state.doc.lineAt(from).text)) break
          if (!onCursorLine(from)) entries.push([from, to, cls.link])
          break
        }
        case 'Image': {
          if (!onCursorLine(from)) {
            // Extract URL from the URL child node to avoid capturing an optional title attribute.
            let src = ''
            for (let child = node.node.firstChild; child; child = child.nextSibling) {
              if (child.name === 'URL') { src = state.doc.sliceString(child.from, child.to).trim(); break }
            }
            const raw = state.doc.sliceString(from, to)
            const altMatch = raw.match(/^!\[([^\]]*)\]/)
            const alt = altMatch ? altMatch[1] : ''
            if (src) entries.push([from, to, Decoration.replace({ widget: new ImageWidget(src, alt) })])
          }
          break
        }
        case 'LinkMark': {
          // Skip marks that are children of an Image — the Image node is replaced wholesale
          if (node.node.parent?.name === 'Image') break
          // Don't style/hide [!TYPE] brackets on callout header lines
          if (/^> \[!/.test(state.doc.lineAt(from).text)) break
          // Don't hide [ or ] that belong to a task marker pattern [ ] / [x]
          const ch = state.doc.sliceString(from, to)
          if (ch === '[') {
            const snip = state.doc.sliceString(from, from + 3)
            if (snip === '[ ]' || snip === '[x]' || snip === '[X]') break
          } else if (ch === ']') {
            const snip = state.doc.sliceString(Math.max(0, from - 2), from + 1)
            if (snip === '[ ]' || snip === '[x]' || snip === '[X]') break
          }
          hideOrMute(from, to)
          break
        }
        case 'URL': {
          if (node.node.parent?.name !== 'Image') {
            if (!/^> \[!/.test(state.doc.lineAt(from).text)) hideOrMute(from, to)
          }
          break
        }
        case 'ListMark': {
          const markText = state.doc.sliceString(from, to)
          if (onCursorLine(from)) {
            entries.push([from, to, cls.marker])
          } else if (/^\d+[.)]$/.test(markText)) {
            // Ordered list: style the number, don't replace with a bullet
            entries.push([from, to, cls.orderedMark])
          } else {
            // Unordered list: replace `-`, `*`, `+` with a bullet widget
            const lineEnd = state.doc.lineAt(from).to
            entries.push([from, Math.min(to + 1, lineEnd), Decoration.replace({ widget: new BulletWidget() })])
          }
          break
        }
        case 'Blockquote': {
          if (calloutLineData.has(state.doc.lineAt(from).number)) break
          entries.push([from, from, cls.blockquote])
          break
        }
        case 'QuoteMark': {
          if (calloutLineData.has(state.doc.lineAt(from).number)) break
          hideOrMute(from, to)
          break
        }
      }
    },
  })

  // Scan visible lines for #tag tokens (# immediately followed by a letter).
  const { from: vpFrom, to: vpTo } = view.viewport
  const visibleText = state.doc.sliceString(vpFrom, vpTo)
  TAG_RE.lastIndex = 0
  for (const match of visibleText.matchAll(TAG_RE)) {
    const from = vpFrom + match.index!
    const to   = from + match[0].length
    entries.push([from, to, cls.tag])
  }

  // Scan for [ ] / [x] checkboxes at line start (with optional leading whitespace or `- `).
  const CHECKBOX_RE = /^[ \t]*(?:[-*+] )?(\[[ xX]\])/gm
  CHECKBOX_RE.lastIndex = 0
  for (const match of visibleText.matchAll(CHECKBOX_RE)) {
    const markerFrom = vpFrom + match.index! + match[0].length - 3
    const markerTo   = markerFrom + 3
    const checked    = match[1] !== '[ ]'
    if (!onCursorLine(markerFrom)) {
      entries.push([markerFrom, markerTo, Decoration.replace({ widget: new CheckboxWidget(checked, markerFrom) })])
    }
  }

  // ── Callout line decorations ─────────────────────────────────────────────
  // Each callout line gets a line-class decoration (background + left border)
  // and — when the cursor is not inside the block — an inline replacement that
  // hides the raw `> [!TYPE] Title` / `> ` prefixes.
  for (const [lineNum, data] of calloutLineData) {
    const line = state.doc.line(lineNum)
    // Skip lines outside the current viewport
    if (line.from > view.viewport.to || line.to < view.viewport.from) continue

    if (calloutCursorBlocks.has(lineNum)) continue

    entries.push([line.from, line.from, Decoration.line({
      class: `cm-moss-callout-line cm-moss-callout-${data.pos} cm-moss-callout-line-${data.variant}`,
    })])

    {
      if (data.pos === 'first' || data.pos === 'only') {
        // Replace the entire `> [!TYPE] Title` line content with the header widget
        entries.push([line.from, line.to, Decoration.replace({
          widget: new CalloutHeaderWidget(data.icon!, data.label!, data.variant),
        })])
      } else {
        // Hide the `> ` prefix so only the body text is visible
        const prefixEnd = line.text.startsWith('> ') ? line.from + 2 : line.from + 1
        entries.push([line.from, prefixEnd, cls.hidden])
      }
    }
  }

  entries.sort((a, b) => a[0] - b[0] || a[2].startSide - b[2].startSide)

  const builder = new RangeSetBuilder<Decoration>()
  for (const [from, to, dec] of entries) {
    builder.add(from, to, dec)
  }
  return builder.finish()
}

const inlineDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: v => v.decorations }
)

// Block decorations (block: true) must live in a StateField — ViewPlugin
// does not support them and CM6 will throw at construction time.
function buildHRDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const cursorLines = new Set<number>()
  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from).number
    const toLine   = state.doc.lineAt(range.to).number
    for (let ln = fromLine; ln <= toLine; ln++) cursorLines.add(ln)
  }

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== 'HorizontalRule') return
      const line = state.doc.lineAt(node.from)
      if (cursorLines.has(line.number)) return
      const end = line.number < state.doc.lines ? line.to + 1 : line.to
      builder.add(line.from, end, Decoration.replace({ widget: new HRWidget(), block: true }))
    },
  })

  return builder.finish()
}

const hrDecorations = StateField.define<DecorationSet>({
  create(state) { return buildHRDecorations(state) },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) return buildHRDecorations(tr.state)
    return deco
  },
  provide(f) { return EditorView.decorations.from(f) },
})

export const markdownDecorations = [inlineDecorations, hrDecorations]
