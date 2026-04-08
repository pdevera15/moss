import { EditorView } from '@codemirror/view'
import { Compartment } from '@codemirror/state'

export const themeCompartment = new Compartment()

// buildMossTheme returns the raw EditorView.theme extension.
// Use this in themeCompartment.reconfigure() for dark mode switching.
// getMossTheme() wraps it in themeCompartment.of() for initial EditorState creation.
export function buildMossTheme(dark: boolean) {
  return EditorView.theme(
    {
      '&': {
        background: 'var(--color-bg)',
        height: '100%',
        color: 'var(--color-text)',
      },
      '.cm-scroller': {
        fontFamily: 'var(--font-body)',
        fontSize: '15px',
        lineHeight: '1.85',
        padding: '48px 64px',
        overflowX: 'hidden',
      },
      '.cm-content': {
        maxWidth: '760px',
        margin: '0 auto',
        caretColor: 'var(--color-amber)',
        padding: '0',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--color-amber)',
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: 'color-mix(in srgb, var(--color-moss) 15%, var(--color-bg))',
      },
      '.cm-activeLine': {
        backgroundColor: 'var(--color-surface)',
        borderRadius: '3px',
      },
      '.cm-gutters': {
        background: 'var(--color-bg)',
        border: 'none',
        color: 'var(--color-text-faint)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        paddingRight: '16px',
      },
      '.cm-placeholder': {
        color: 'var(--color-text-faint)',
        fontStyle: 'italic',
      },
      '.cm-line': {
        padding: '0',
      },
    },
    { dark }
  )
}

export function getMossTheme(dark = false) {
  return themeCompartment.of(buildMossTheme(dark))
}
