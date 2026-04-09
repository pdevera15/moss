<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
  import { EditorState } from '@codemirror/state'
  import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
  import { markdown } from '@codemirror/lang-markdown'
  import { languages } from '@codemirror/language-data'
  import { getMossTheme, buildMossTheme, themeCompartment } from '$lib/editor/mossTheme'
  import { markdownDecorations } from '$lib/editor/markdownDecorations'
  import { floatingToolbar } from '$lib/editor/floatingToolbar'

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

  function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
    let timer: ReturnType<typeof setTimeout>
    return ((...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms) }) as T
  }

  const emitChange = debounce((v: string) => onchange?.(v), 300)

  onMount(() => {
    const darkMQ = window.matchMedia('(prefers-color-scheme: dark)')

    const state = EditorState.create({
      doc: value,
      extensions: [
        markdown({ codeLanguages: languages }),
        getMossTheme(darkMQ.matches),
        markdownDecorations,
        floatingToolbar,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        cmPlaceholder(placeholder),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString()
            value = newValue
            emitChange(newValue)
          }
        }),
      ],
    })

    view = new EditorView({ state, parent: container })

    // Use buildMossTheme (raw) for reconfigure — NOT getMossTheme (which wraps in compartment.of)
    function onColorSchemeChange(e: MediaQueryListEvent) {
      view.dispatch({
        effects: themeCompartment.reconfigure(buildMossTheme(e.matches)),
      })
    }

    darkMQ.addEventListener('change', onColorSchemeChange)
    return () => darkMQ.removeEventListener('change', onColorSchemeChange)
  })

  onDestroy(() => view?.destroy())
</script>

<div class="editor-host" bind:this={container}></div>

<style>
  .editor-host {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
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
  :global(.cm-moss-bold)   { font-weight: 700; }
  :global(.cm-moss-italic) { font-style: italic; }

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
