import { EditorView } from '@codemirror/view'
import { Compartment } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

/**
 * Module-level Compartment for the Moss theme.
 * Safe for single-editor use only — do not share across multiple EditorView instances.
 * Used in Editor.svelte: created once at state init, reconfigured on dark mode change.
 */
export const themeCompartment = new Compartment()

export const mossHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword,                      color: 'var(--color-moss-dark)', fontWeight: 'bold' },
  { tag: tags.string,                       color: 'var(--color-amber)' },
  { tag: tags.comment,                      color: 'var(--color-text-muted)', fontStyle: 'italic' },
  { tag: [tags.number, tags.bool],          color: 'var(--color-moss)' },
  { tag: [tags.operator, tags.punctuation], color: 'var(--color-text-muted)' },
  { tag: [tags.typeName, tags.className],   color: 'var(--color-moss-light)' },
])

export function getMossHighlighting() {
  return syntaxHighlighting(mossHighlightStyle)
}

// buildMossTheme returns the raw EditorView.theme extension.
// Use this in themeCompartment.reconfigure() for dark mode switching.
// getMossTheme() wraps it in themeCompartment.of() for initial EditorState creation.
export function buildMossTheme(dark = false) {
  return EditorView.theme(
    {
      '&': {
        background: 'var(--color-bg)',
        height: '100%',
        color: 'var(--color-text)',
        colorScheme: 'light',
      },
      '.cm-scroller': {
        fontFamily: 'var(--font-body)',
        fontSize: '15px',
        lineHeight: '1.85',
        overflowX: 'hidden',
      },
      '.cm-line': {
        lineHeight: '1.85',
        padding: '0 64px',
      },
      '.cm-content': {
        maxWidth: '760px',
        margin: '0 auto',
        caretColor: 'var(--color-amber)',
        padding: '48px 0',
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
        borderRadius: 'var(--radius-sm)',
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
    },
    { dark }
  )
}

export function getMossTheme(dark = false) {
  return themeCompartment.of(buildMossTheme(dark))
}
