<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    drawSelection,
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
  import { getMossHighlighting } from "$lib/editor/mossTheme";
  import { mossEditorTheme } from "$lib/editor/mossEditorTheme";
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
        mossEditorTheme,
        drawSelection(),
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

</style>
