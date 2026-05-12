<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    EditorView,
    keymap,
    placeholder as cmPlaceholder,
  } from "@codemirror/view";
  import { EditorState, Prec } from "@codemirror/state";
  import {
    history,
    historyKeymap,
    defaultKeymap,
    indentWithTab,
  } from "@codemirror/commands";
  import { markdown } from "@codemirror/lang-markdown";
  import { languages } from "@codemirror/language-data";
  import { Strikethrough, Table } from "@lezer/markdown";
  import { getMossTheme, getMossHighlighting } from "$lib/editor/mossTheme";
  import { markdownDecorations } from "$lib/editor/markdownDecorations";
  import {
    floatingToolbar,
    markdownKeymap,
    rightClickGuard,
  } from "$lib/editor/floatingToolbar";

  let {
    value = $bindable(""),
    onchange,
    placeholder = "Start writing…",
  }: {
    value?: string;
    onchange?: (value: string) => void;
    placeholder?: string;
  } = $props();

  let container: HTMLDivElement;
  let view: EditorView;
  let isExternalUpdate = false;

  function debounce<T extends (...args: never[]) => void>(
    fn: T,
    ms: number,
  ): T & { cancel(): void } {
    let timer: ReturnType<typeof setTimeout>;
    const d = ((...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    }) as T & { cancel(): void };
    d.cancel = () => clearTimeout(timer);
    return d;
  }

  const emitChange = debounce((v: string) => onchange?.(v), 300);

  // Sync external value changes (e.g. switching notes) into CodeMirror.
  // Cancel any pending debounced emit so stale content can't overwrite the new note.
  $effect(() => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      emitChange.cancel();
      isExternalUpdate = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
      isExternalUpdate = false;
    }
  });

  // Focus the editor whenever the active note changes so the cursor is visible.
  onMount(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        // Highest-priority Enter handler: exits an empty blockquote continuation
        // line ("> " or ">") created by the markdown extension's auto-continue.
        // Must use Prec.highest so it fires before the markdown() extension's
        // own Enter handler, which would otherwise create yet another "> " line.
        Prec.highest(
          keymap.of([
            {
              key: "Enter",
              run(v) {
                const range = v.state.selection.main;
                if (!range.empty) return false;
                const line = v.state.doc.lineAt(range.head);
                if (line.text !== ">" && line.text !== "> ") return false;
                // Replace "> " with "\n" so the current line becomes empty and
                // the cursor lands on the new blank line below it.
                v.dispatch({
                  changes: { from: line.from, to: line.to, insert: "\n" },
                  selection: { anchor: line.from + 1 },
                  scrollIntoView: true,
                });
                return true;
              },
            },
          ]),
        ),
        markdown({
          codeLanguages: languages,
          extensions: [Strikethrough, Table],
        }),
        getMossTheme(false),
        getMossHighlighting(),
        markdownDecorations,
        floatingToolbar,
        rightClickGuard,
        history(),
        keymap.of([
          ...markdownKeymap,
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.lineWrapping,
        cmPlaceholder(placeholder),
        EditorView.updateListener.of((update) => {
          if (
            !update.docChanged &&
            !update.selectionSet &&
            !update.viewportChanged
          )
            return;
          requestAnimationFrame(() => update.view.requestMeasure());
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isExternalUpdate) {
            const newValue = update.state.doc.toString();
            value = newValue;
            emitChange(newValue);
          }
        }),
      ],
    });

    view = new EditorView({ state, parent: container });
    view.focus();

    // Custom fonts (Lora, DM Serif Display, Geist Mono) load asynchronously.
    // CM6 measures line heights on mount using whatever font is rendered at
    // that instant — usually a fallback with different metrics. The error is
    // small per line but accumulates, so clicks land on the wrong line further
    // down the document. Re-measuring after fonts are ready fixes it.
    document.fonts.ready.then(() => {
      view?.requestMeasure();
    });
    document.fonts.addEventListener("loadingdone", onFontsLoaded);
  });

  function onFontsLoaded() {
    view?.requestMeasure();
  }

  onDestroy(() => {
    emitChange.cancel();
    document.fonts.removeEventListener("loadingdone", onFontsLoaded);
    view?.destroy();
  });
</script>

<div class="editor-host" bind:this={container}></div>

<style>
  .editor-host {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
    cursor: text;
    color-scheme: light;
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
  }
  :global(.cm-moss-h2) {
    font-family: var(--font-title);
    font-size: 22px;
    font-weight: 400;
    letter-spacing: -0.015em;
  }
  :global(.cm-moss-h3) {
    font-family: var(--font-title);
    font-size: 18px;
    font-weight: 400;
  }

  /* ── Inline decorations ───────────────────────────────────────────── */
  :global(.cm-moss-bold) {
    font-weight: 700;
  }
  :global(.cm-moss-italic) {
    font-style: italic;
  }
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
    overflow: hidden;
    position: relative;
  }
  :global(.cm-moss-fence-open::before) {
    content: attr(data-lang);
    display: block;
    position: absolute;
    top: 4px;
    right: 68px;
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
  }
  /* Closing fence line: fully collapsed */
  :global(.cm-moss-fence-close) {
    color: transparent !important;
    overflow: hidden;
  }
  :global(.cm-moss-fenced-line) {
    background: linear-gradient(
      to right,
      transparent 0 64px,
      var(--color-surface) 64px calc(100% - 64px),
      transparent calc(100% - 64px)
    );
    font-family: var(--font-mono);
    font-size: 13px;
    padding-left: 76px !important;
    padding-right: 76px !important;
  }
  :global(.cm-moss-hr) {
    color: transparent;
    position: relative;
  }
  :global(.cm-moss-hr::after) {
    content: "";
    position: absolute;
    left: 64px;
    right: 64px;
    top: 50%;
    border-top: 1.5px solid var(--color-border);
    transform: translateY(-50%);
    pointer-events: none;
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
    content: "";
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

  /* ── Callout blocks (line-decoration approach) ───────────────────────── */
  :global(.cm-moss-callout-line) {
    border-left: 3px solid;
    padding-left: 16px !important;
  }
  :global(.cm-moss-callout-first) {
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    padding-top: 5px !important;
  }
  :global(.cm-moss-callout-last) {
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    padding-bottom: 5px !important;
  }
  :global(.cm-moss-callout-only) {
    border-radius: var(--radius-md);
    padding-top: 4px !important;
    padding-bottom: 4px !important;
  }
  /* variant backgrounds + borders */
  :global(.cm-moss-callout-line-info) {
    background: var(--callout-info-bg);
    border-color: var(--callout-info-border);
    color: var(--callout-info-color);
  }
  :global(.cm-moss-callout-line-tip) {
    background: var(--callout-tip-bg);
    border-color: var(--callout-tip-border);
    color: var(--callout-tip-color);
  }
  :global(.cm-moss-callout-line-success) {
    background: var(--callout-success-bg);
    border-color: var(--callout-success-border);
    color: var(--callout-success-color);
  }
  :global(.cm-moss-callout-line-warning) {
    background: var(--callout-warning-bg);
    border-color: var(--callout-warning-border);
    color: var(--callout-warning-color);
  }
  :global(.cm-moss-callout-line-danger) {
    background: var(--callout-danger-bg);
    border-color: var(--callout-danger-border);
    color: var(--callout-danger-color);
  }
  :global(.cm-moss-callout-line-example) {
    background: var(--callout-example-bg);
    border-color: var(--callout-example-border);
    color: var(--callout-example-color);
  }
  :global(.cm-moss-callout-line-quote) {
    background: var(--callout-quote-bg);
    border-color: var(--callout-quote-border);
    color: var(--callout-quote-color);
    font-style: italic;
  }
  /* inline header widget (icon + label) */
  :global(.cm-moss-callout-type) {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
  :global(.cm-moss-callout-type-info) {
    color: var(--callout-info-border);
  }
  :global(.cm-moss-callout-type-tip) {
    color: var(--callout-tip-border);
  }
  :global(.cm-moss-callout-type-success) {
    color: var(--callout-success-border);
  }
  :global(.cm-moss-callout-type-warning) {
    color: var(--callout-warning-border);
  }
  :global(.cm-moss-callout-type-danger) {
    color: var(--callout-danger-border);
  }
  :global(.cm-moss-callout-type-example) {
    color: var(--callout-example-border);
  }
  :global(.cm-moss-callout-type-quote) {
    color: var(--callout-quote-border);
  }

  /* ── Tables (GFM) ─────────────────────────────────────────────────── */
  :global(.cm-moss-table-wrapper) {
    margin: var(--space-3) 0;
    overflow-x: auto;
    user-select: text;
  }
  :global(.cm-moss-table) {
    border-collapse: collapse;
    font-family: var(--font-body);
    font-size: 13.5px;
    line-height: 1.6;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  :global(.cm-moss-table th),
  :global(.cm-moss-table td) {
    padding: 6px 12px;
    border: 1px solid var(--color-border);
    text-align: left;
    vertical-align: top;
  }
  :global(.cm-moss-table th) {
    font-weight: 600;
    background: var(--color-surface);
    color: var(--color-text);
  }
  :global(.cm-moss-table tbody tr:nth-child(even) td) {
    background: color-mix(in srgb, var(--color-surface) 50%, transparent);
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
    color: #f0eee9;
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
