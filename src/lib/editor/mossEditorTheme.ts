import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

export const mossEditorTheme: Extension = EditorView.theme({
  // ── Structural ────────────────────────────────────────────────────────────
  '&': {
    background: 'var(--color-bg)',
    height: '100%',
    color: 'var(--color-text)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-body)',
    fontSize: '15px',
    lineHeight: '1.85',
    overflowX: 'hidden',
  },
  '.cm-content': {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '48px 0',
    caretColor: 'var(--color-amber) !important',
  },
  '.cm-line': {
    lineHeight: '1.85',
    padding: '0 64px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, & ::selection': {
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
  // Some line decorations use color:transparent, which makes caret-color:auto invisible.
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--color-amber) !important',
  },

  // ── Headings ──────────────────────────────────────────────────────────────
  '.cm-moss-h1': {
    fontFamily: 'var(--font-title)',
    fontSize: '28px',
    fontWeight: '400',
    letterSpacing: '-0.025em',
  },
  '.cm-moss-h2': {
    fontFamily: 'var(--font-title)',
    fontSize: '22px',
    fontWeight: '400',
    letterSpacing: '-0.015em',
  },
  '.cm-moss-h3': {
    fontFamily: 'var(--font-title)',
    fontSize: '18px',
    fontWeight: '400',
  },

  // ── Inline decorations ────────────────────────────────────────────────────
  '.cm-moss-bold': {
    fontWeight: '700',
  },
  '.cm-moss-italic': {
    fontStyle: 'italic',
  },
  '.cm-moss-strikethrough': {
    textDecoration: 'line-through',
    color: 'var(--color-text-muted)',
  },
  '.cm-moss-code': {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    background: 'var(--color-moss-tint)',
    color: 'var(--color-moss-dark)',
    borderRadius: '3px',
    padding: '1px 4px',
  },
  '.cm-moss-link': {
    color: 'var(--color-moss)',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  '.cm-moss-blockquote': {
    borderLeft: '3px solid var(--color-border)',
    paddingLeft: '12px',
    color: 'var(--color-text-muted)',
  },
  '.cm-moss-ordered-mark': {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    color: 'var(--color-moss)',
  },

  // ── Bullet widget ─────────────────────────────────────────────────────────
  '.cm-moss-bullet': {
    display: 'inline',
    color: 'var(--color-moss-light)',
    marginRight: '4px',
  },

  // ── Fenced code blocks ────────────────────────────────────────────────────
  '.cm-moss-fence-open': {
    color: 'transparent !important',
    overflow: 'hidden',
    position: 'relative',
  },
  '.cm-moss-fence-open::before': {
    content: 'attr(data-lang)',
    display: 'block',
    position: 'absolute',
    top: '4px',
    right: '68px',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    lineHeight: '1',
    color: 'var(--color-text-muted)',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 6px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    userSelect: 'none',
  },
  '.cm-moss-fence-close': {
    color: 'transparent !important',
    overflow: 'hidden',
  },
  '.cm-moss-fenced-line': {
    background:
      'linear-gradient(to right, transparent 0 64px, var(--color-surface) 64px calc(100% - 64px), transparent calc(100% - 64px))',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    paddingLeft: '76px !important',
    paddingRight: '76px !important',
  },

  // ── Horizontal rule ───────────────────────────────────────────────────────
  '.cm-moss-hr': {
    color: 'transparent',
    position: 'relative',
  },
  '.cm-moss-hr::after': {
    content: '""',
    position: 'absolute',
    left: '64px',
    right: '64px',
    top: '50%',
    borderTop: '1.5px solid var(--color-border)',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },

  // ── Images ────────────────────────────────────────────────────────────────
  '.cm-moss-image': {
    maxWidth: '100%',
    borderRadius: 'var(--radius-md)',
    display: 'block',
    margin: 'var(--space-1) 0',
  },
  '.cm-moss-image-placeholder': {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 6px',
  },

  // ── Checkboxes ────────────────────────────────────────────────────────────
  '.cm-moss-checkbox': {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '1.5px solid var(--color-text-muted)',
    borderRadius: '3px',
    cursor: 'pointer',
    verticalAlign: 'middle',
    marginRight: '6px',
    position: 'relative',
    top: '-1px',
    flexShrink: '0',
  },
  '.cm-moss-checkbox-checked': {
    background: 'var(--color-moss)',
    borderColor: 'var(--color-moss)',
  },
  '.cm-moss-checkbox-checked::after': {
    content: '""',
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '4px',
    height: '7px',
    border: '1.5px solid #fff',
    borderTop: 'none',
    borderLeft: 'none',
    transform: 'translate(-50%, -60%) rotate(45deg)',
  },

  // ── Tags ──────────────────────────────────────────────────────────────────
  '.cm-moss-tag': {
    color: 'var(--color-moss-dark)',
    background: 'var(--color-moss-tint)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    borderRadius: '4px',
    padding: '1px 5px',
  },

  // ── Callout blocks ────────────────────────────────────────────────────────
  '.cm-moss-callout-line': {
    borderLeft: '3px solid',
    paddingLeft: '16px !important',
  },
  '.cm-moss-callout-first': {
    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
    paddingTop: '5px !important',
  },
  '.cm-moss-callout-last': {
    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
    paddingBottom: '5px !important',
  },
  '.cm-moss-callout-only': {
    borderRadius: 'var(--radius-md)',
    paddingTop: '4px !important',
    paddingBottom: '4px !important',
  },
  '.cm-moss-callout-line-info': {
    background: 'var(--callout-info-bg)',
    borderColor: 'var(--callout-info-border)',
    color: 'var(--callout-info-color)',
  },
  '.cm-moss-callout-line-tip': {
    background: 'var(--callout-tip-bg)',
    borderColor: 'var(--callout-tip-border)',
    color: 'var(--callout-tip-color)',
  },
  '.cm-moss-callout-line-success': {
    background: 'var(--callout-success-bg)',
    borderColor: 'var(--callout-success-border)',
    color: 'var(--callout-success-color)',
  },
  '.cm-moss-callout-line-warning': {
    background: 'var(--callout-warning-bg)',
    borderColor: 'var(--callout-warning-border)',
    color: 'var(--callout-warning-color)',
  },
  '.cm-moss-callout-line-danger': {
    background: 'var(--callout-danger-bg)',
    borderColor: 'var(--callout-danger-border)',
    color: 'var(--callout-danger-color)',
  },
  '.cm-moss-callout-line-example': {
    background: 'var(--callout-example-bg)',
    borderColor: 'var(--callout-example-border)',
    color: 'var(--callout-example-color)',
  },
  '.cm-moss-callout-line-quote': {
    background: 'var(--callout-quote-bg)',
    borderColor: 'var(--callout-quote-border)',
    color: 'var(--callout-quote-color)',
    fontStyle: 'italic',
  },
  '.cm-moss-callout-type': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
  },
  '.cm-moss-callout-type-info':    { color: 'var(--callout-info-border)' },
  '.cm-moss-callout-type-tip':     { color: 'var(--callout-tip-border)' },
  '.cm-moss-callout-type-success': { color: 'var(--callout-success-border)' },
  '.cm-moss-callout-type-warning': { color: 'var(--callout-warning-border)' },
  '.cm-moss-callout-type-danger':  { color: 'var(--callout-danger-border)' },
  '.cm-moss-callout-type-example': { color: 'var(--callout-example-border)' },
  '.cm-moss-callout-type-quote':   { color: 'var(--callout-quote-border)' },

  // ── Tables ────────────────────────────────────────────────────────────────
  '.cm-moss-table-wrapper': {
    margin: 'var(--space-3) 0',
    overflowX: 'auto',
    userSelect: 'text',
  },
  '.cm-moss-table': {
    borderCollapse: 'collapse',
    fontFamily: 'var(--font-body)',
    fontSize: '13.5px',
    lineHeight: '1.6',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
  },
  '.cm-moss-table th, .cm-moss-table td': {
    padding: '6px 12px',
    border: '1px solid var(--color-border)',
    textAlign: 'left',
    verticalAlign: 'top',
  },
  '.cm-moss-table th': {
    fontWeight: '600',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
  },
  '.cm-moss-table tbody tr:nth-child(even) td': {
    background: 'color-mix(in srgb, var(--color-surface) 50%, transparent)',
  },

  // ── Floating toolbar ──────────────────────────────────────────────────────
  '.cm-moss-float-toolbar': {
    display: 'flex',
    alignItems: 'center',
    gap: '1px',
    background: 'var(--color-text)',
    borderRadius: 'var(--radius-md)',
    padding: '4px 6px',
    boxShadow: 'var(--shadow-md)',
    zIndex: '100',
    pointerEvents: 'all',
  },
  '.cm-moss-float-btn': {
    width: '28px',
    height: '26px',
    border: 'none',
    background: 'transparent',
    borderRadius: '4px',
    color: '#f0eee9',
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    transition: 'background 80ms',
  },
  '.cm-moss-float-btn:hover': {
    background: 'rgba(255, 255, 255, 0.12)',
  },
  '.cm-moss-float-divider': {
    width: '1px',
    height: '16px',
    background: 'rgba(255, 255, 255, 0.15)',
    margin: '0 3px',
    flexShrink: '0',
  },
})
