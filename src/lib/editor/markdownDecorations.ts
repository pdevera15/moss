import {
  ViewPlugin,
  Decoration,
  ViewUpdate,
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

class HRWidget extends WidgetType {
  toDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'cm-moss-hr'
    div.setAttribute('aria-hidden', 'true')
    return div
  }
  eq(): boolean { return true }
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
}

// Matches #tag and #nested/tag — must start with a letter, no spaces.
// A leading space or start-of-line + space before # is fine; what matters
// is that the character immediately after # is not a space (which would
// make it a heading mark instead).
const TAG_RE = /(?<![&\w])#(\p{L}[\p{L}\p{N}_\-/]*)/gu

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
          const firstLine = state.doc.lineAt(from).number
          const lastLine  = state.doc.lineAt(to).number
          for (let ln = firstLine; ln <= lastLine; ln++) {
            const line = state.doc.line(ln)
            entries.push([line.from, line.from, cls.fencedLine])
          }
          break
        }
        case 'Link':     if (!onCursorLine(from)) entries.push([from, to, cls.link]); break
        case 'LinkMark': {
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
        case 'URL':            hideOrMute(from, to); break
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
        case 'Blockquote': entries.push([from, from, cls.blockquote]); break
        case 'QuoteMark':  hideOrMute(from, to); break
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
