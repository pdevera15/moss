<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
  import { EditorState } from '@codemirror/state'
  import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
  import { markdown } from '@codemirror/lang-markdown'
  import { languages } from '@codemirror/language-data'
  import { Strikethrough } from '@lezer/markdown'
  import { getMossTheme, getMossHighlighting } from '$lib/editor/mossTheme'
  import { markdownDecorations } from '$lib/editor/markdownDecorations'
  import { floatingToolbar, markdownKeymap } from '$lib/editor/floatingToolbar'

  let {
    value = $bindable(''),
    onchange,
    placeholder = 'Start writing…',
  }: {
    value?: string
    onchange?: (value: string) => void
    placeholder?: string
  } = $props()

  let container: HTMLDivElement
  let view: EditorView
  let isExternalUpdate = false

  function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T & { cancel(): void } {
    let timer: ReturnType<typeof setTimeout>
    const d = ((...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms) }) as T & { cancel(): void }
    d.cancel = () => clearTimeout(timer)
    return d
  }

  const emitChange = debounce((v: string) => onchange?.(v), 300)

  // Sync external value changes (e.g. switching notes) into CodeMirror.
  // Cancel any pending debounced emit so stale content can't overwrite the new note.
  $effect(() => {
    if (!view) return
    const current = view.state.doc.toString()
    if (value !== current) {
      emitChange.cancel()
      isExternalUpdate = true
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
      isExternalUpdate = false
    }
  })

  onMount(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        markdown({ codeLanguages: languages, extensions: [Strikethrough] }),
        getMossTheme(false),
        getMossHighlighting(),
        markdownDecorations,
        floatingToolbar,
        history(),
        keymap.of([...markdownKeymap, ...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        cmPlaceholder(placeholder),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !isExternalUpdate) {
            const newValue = update.state.doc.toString()
            value = newValue
            emitChange(newValue)
          }
        }),
      ],
    })

    view = new EditorView({ state, parent: container })

  })

  onDestroy(() => {
    emitChange.cancel()
    view?.destroy()
  })
</script>

<div class="editor-host" bind:this={container}></div>

<style>
  .editor-host {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Force cursor to always be amber — some line decorations use
     color:transparent which can cause caret-color:auto to go invisible. */
  :global(.cm-editor .cm-cursor),
  :global(.cm-editor .cm-dropCursor) {
    border-left-color: var(--color-amber) !important;
  }
  :global(.cm-editor .cm-content) {
    caret-color: var(--color-amber) !important;
  }

  /* ── Heading decorations ──────────────────────────────────────────── */
  :global(.cm-moss-h1) {
    font-family: var(--font-title);
    font-size: 28px;
    font-weight: 400;
    letter-spacing: -0.025em;
    line-height: 1.2;
  }
  :global(.cm-moss-h2) {
    font-family: var(--font-title);
    font-size: 22px;
    font-weight: 400;
    letter-spacing: -0.015em;
    line-height: 1.3;
  }
  :global(.cm-moss-h3) {
    font-family: var(--font-title);
    font-size: 18px;
    font-weight: 400;
    line-height: 1.4;
  }

  /* ── Inline decorations ───────────────────────────────────────────── */
  :global(.cm-moss-bold)          { font-weight: 700; }
  :global(.cm-moss-italic)        { font-style: italic; }
  :global(.cm-moss-strikethrough) {
    text-decoration: line-through;
    color: var(--color-text-muted);
  }

  :global(.cm-moss-code) {
    font-family: var(--font-mono);
    font-size: 13px;
    background: var(--color-moss-tint);
    color: var(--color-moss-dark);
    border-radius: 3px;
    padding: 1px 4px;
  }
  :global(.cm-moss-link) {
    color: var(--color-moss);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  :global(.cm-moss-blockquote) {
    border-left: 3px solid var(--color-border);
    padding-left: 12px;
    color: var(--color-text-muted);
  }
  :global(.cm-moss-marker) {
    color: var(--color-text-faint);
    font-family: var(--font-mono);
    font-size: 13px;
  }
  :global(.cm-moss-bullet) {
    color: var(--color-moss-light);
    margin-right: 4px;
  }
  :global(.cm-moss-ordered-mark) {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--color-moss);
  }
  /* Opening fence line: hide the ``` text, show language via ::before */
  :global(.cm-moss-fence-open) {
    color: transparent !important;
    background: var(--color-surface);
    overflow: hidden;
  }
  :global(.cm-moss-fence-open::before) {
    content: attr(data-lang);
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 10px;
    line-height: 1;
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 2px 6px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    user-select: none;
    float: right;
    margin: 4px 10px 4px 0;
  }
  /* Closing fence line: fully collapsed */
  :global(.cm-moss-fence-close) {
    color: transparent !important;
    overflow: hidden;
  }
  :global(.cm-moss-fenced-line) {
    background: var(--color-surface);
    font-family: var(--font-mono);
    font-size: 13px;
    display: block;
  }
  :global(.cm-moss-hr) {
    border-top: 1.5px solid var(--color-border);
    margin: var(--space-2) 0;
    width: 100%;
    display: block;
  }

  :global(.cm-moss-image) {
    max-width: 100%;
    border-radius: var(--radius-md);
    display: block;
    margin: var(--space-1) 0;
  }

  :global(.cm-moss-image-placeholder) {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-text-muted);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    padding: 2px 6px;
  }

  :global(.cm-moss-checkbox) {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 1.5px solid var(--color-text-muted);
    border-radius: 3px;
    cursor: pointer;
    vertical-align: middle;
    margin-right: 6px;
    position: relative;
    top: -1px;
    flex-shrink: 0;
  }
  :global(.cm-moss-checkbox-checked) {
    background: var(--color-moss);
    border-color: var(--color-moss);
  }
  :global(.cm-moss-checkbox-checked::after) {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 4px;
    height: 7px;
    border: 1.5px solid #fff;
    border-top: none;
    border-left: none;
    transform: translate(-50%, -60%) rotate(45deg);
  }

  :global(.cm-moss-tag) {
    color: var(--color-moss-dark);
    background: var(--color-moss-tint);
    font-family: var(--font-mono);
    font-size: 12px;
    border-radius: 4px;
    padding: 1px 5px;
  }

  /* ── Floating toolbar ─────────────────────────────────────────────── */
  :global(.cm-moss-float-toolbar) {
    display: flex;
    align-items: center;
    gap: 1px;
    background: var(--color-text);
    border-radius: var(--radius-md);
    padding: 4px 6px;
    box-shadow: var(--shadow-md);
    z-index: 100;
    pointer-events: all;
  }
  :global(.cm-moss-float-btn) {
    width: 28px;
    height: 26px;
    border: none;
    background: transparent;
    border-radius: 4px;
    color: #F0EEE9;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--font-mono);
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 80ms;
  }
  :global(.cm-moss-float-btn:hover) {
    background: rgba(255, 255, 255, 0.12);
  }
  :global(.cm-moss-float-divider) {
    width: 1px;
    height: 16px;
    background: rgba(255, 255, 255, 0.15);
    margin: 0 3px;
    flex-shrink: 0;
  }
</style>
