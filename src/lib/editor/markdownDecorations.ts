import {
  ViewPlugin,
  Decoration,
  DecorationSet,
  ViewUpdate,
  EditorView,
  WidgetType,
} from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
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

const cls = {
  h1:         Decoration.mark({ class: 'cm-moss-h1' }),
  h2:         Decoration.mark({ class: 'cm-moss-h2' }),
  h3:         Decoration.mark({ class: 'cm-moss-h3' }),
  bold:       Decoration.mark({ class: 'cm-moss-bold' }),
  italic:     Decoration.mark({ class: 'cm-moss-italic' }),
  code:       Decoration.mark({ class: 'cm-moss-code' }),
  link:       Decoration.mark({ class: 'cm-moss-link' }),
  blockquote: Decoration.mark({ class: 'cm-moss-blockquote' }),
  marker:     Decoration.mark({ class: 'cm-moss-marker' }),
  hidden:     Decoration.replace({}),
}

function getCursorLines(view: EditorView): Set<number> {
  const lines = new Set<number>()
  for (const range of view.state.selection.ranges) {
    const fromLine = view.state.doc.lineAt(range.from).number
    const toLine   = view.state.doc.lineAt(range.to).number
    for (let l = fromLine; l <= toLine; l++) lines.add(l)
  }
  return lines
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const { state } = view
  const cursorLines = getCursorLines(view)

  function onCursor(pos: number): boolean {
    return cursorLines.has(state.doc.lineAt(pos).number)
  }

  function hideOrMute(from: number, to: number): void {
    if (onCursor(from)) {
      builder.add(from, to, cls.marker)
    } else {
      builder.add(from, to, cls.hidden)
    }
  }

  syntaxTree(state).iterate({
    from: view.viewport.from,
    to:   view.viewport.to,
    enter(node) {
      const { from, to, name } = node

      switch (name) {
        case 'ATXHeading1': builder.add(from, to, cls.h1); break
        case 'ATXHeading2': builder.add(from, to, cls.h2); break
        case 'ATXHeading3': builder.add(from, to, cls.h3); break
        case 'HeaderMark': {
          // +1 to include the space after #, clamped to line end
          const lineEnd = state.doc.lineAt(from).to
          hideOrMute(from, Math.min(to + 1, lineEnd))
          break
        }
        case 'StrongEmphasis': builder.add(from, to, cls.bold); break
        case 'Emphasis':       builder.add(from, to, cls.italic); break
        case 'EmphasisMark':   hideOrMute(from, to); break
        case 'InlineCode':     builder.add(from, to, cls.code); break
        case 'CodeMark':       hideOrMute(from, to); break
        case 'Link':           builder.add(from, to, cls.link); break
        case 'LinkMark':       hideOrMute(from, to); break
        case 'URL':            hideOrMute(from, to); break
        case 'ListMark': {
          if (onCursor(from)) {
            builder.add(from, to, cls.marker)
          } else {
            const lineEnd = state.doc.lineAt(from).to
            builder.add(from, Math.min(to + 1, lineEnd), Decoration.replace({ widget: new BulletWidget() }))
          }
          break
        }
        case 'Blockquote': builder.add(from, to, cls.blockquote); break
        case 'QuoteMark':  hideOrMute(from, to); break
      }
    },
  })

  return builder.finish()
}

export const markdownDecorations = ViewPlugin.fromClass(
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
