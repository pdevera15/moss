<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, keymap, highlightSpecialChars, drawSelection, dropCursor, highlightActiveLine } from "@codemirror/view";
  import { EditorState } from "@codemirror/state";
  import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";
  import { bracketMatching, indentOnInput } from "@codemirror/language";
  import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
  import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";

  let activeSection = $state<'notes' | 'tasks' | 'search'>('notes');

  let editorElement: HTMLDivElement;
  let view: EditorView;

  onMount(() => {
    view = new EditorView({
      parent: node,
      state: EditorState.create({
        doc: "console.log('Simple TS implementation');",
        extensions: [
          highlightSpecialChars(),
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          highlightActiveLine(),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
          ])
        ],
      parent: editorElement
    }),
  });
  });

  onDestroy(() => {
    if (view) view.destroy();
  });

</script>
<div class="app-shell">

  <!-- ── Sidebar (208px) ─────────────────────────────────────────────── -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <span class="logo-mark">M</span>
      <span class="logo-text">moss</span>
    </div>

    <nav class="sidebar-nav">
      <button
        class="nav-item"
        class:active={activeSection === 'notes'}
        onclick={() => (activeSection = 'notes')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Notes
      </button>

      <button
        class="nav-item"
        class:active={activeSection === 'tasks'}
        onclick={() => (activeSection = 'tasks')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 11 12 14 22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        Tasks
      </button>

      <button
        class="nav-item"
        class:active={activeSection === 'search'}
        onclick={() => (activeSection = 'search')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Search
      </button>
    </nav>

    <div class="sidebar-tags">
      <p class="tags-heading">Tags</p>
      <!-- placeholder -->
      <span class="tag">#journal</span>
      <span class="tag">#work</span>
      <span class="tag">#ideas</span>
    </div>

    <div class="sidebar-footer">
      <button class="nav-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          <path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>
        </svg>
        Settings
      </button>
    </div>
  </aside>

  <!-- ── Note list (264px) ───────────────────────────────────────────── -->
  <section class="note-list">
    <div class="note-list-header">
      <h2 class="note-list-title">
        {#if activeSection === 'notes'}All Notes
        {:else if activeSection === 'tasks'}Tasks
        {:else}Search{/if}
      </h2>
      <button class="icon-btn" title="New note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- Placeholder note cards -->
    {#each ['Welcome to Moss', 'Getting started', 'My first note'] as title, i}
      <button class="note-card" class:selected={i === 0}>
        <p class="note-card-title">{title}</p>
        <p class="note-card-preview">Start writing here…</p>
        <time class="note-card-date">Today</time>
      </button>
    {/each}
  </section>

  <!-- ── Editor (flex-1) ────────────────────────────────────────────── -->
  <main class="editor-pane">
    <div class="editor-toolbar">
      <!-- CodeMirror toolbar placeholder -->
      <span class="toolbar-placeholder">editor toolbar</span>
    </div>
    <div class="editor-content">
      <h1 class="editor-title" contenteditable="true" spellcheck="false">Welcome to Moss</h1>
      <div class="editor-body" contenteditable="true" spellcheck="false" bind:this={editorElement}>
        <p>Start writing. CodeMirror 6 goes here.</p>
      </div>
    </div>
  </main>

</div>

<style>
  /* ── Shell ──────────────────────────────────────────────────────────── */
  .app-shell {
    display: flex;
    height: 100vh;
    background: var(--color-bg);
    overflow: hidden;
  }

  /* ── Sidebar ────────────────────────────────────────────────────────── */
  .sidebar {
    width: 208px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--color-border);
    padding: 16px 12px;
    gap: 8px;
    background: var(--color-surface);
  }

  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px 12px;
    border-bottom: 1px solid var(--color-border);
  }

  .logo-mark {
    width: 28px;
    height: 28px;
    background: var(--color-moss);
    color: #fff;
    border-radius: var(--radius-md);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.5px;
    flex-shrink: 0;
  }

  .logo-text {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: -0.3px;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: 8px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    border-radius: var(--radius-sm);
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: background 120ms, color 120ms;
  }

  .nav-item:hover  { background: var(--color-border); color: var(--color-text); }
  .nav-item.active { background: var(--color-moss);   color: #fff; }

  .sidebar-tags {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .tags-heading {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    padding: 0 8px;
    margin: 0 0 4px;
  }

  .tag {
    padding: 4px 8px;
    font-size: 12px;
    color: var(--color-text-muted);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .tag:hover { background: var(--color-border); color: var(--color-text); }

  .sidebar-footer {
    margin-top: auto;
    border-top: 1px solid var(--color-border);
    padding-top: 8px;
  }

  /* ── Note list ──────────────────────────────────────────────────────── */
  .note-list {
    width: 264px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
  }

  .note-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 8px;
    position: sticky;
    top: 0;
    background: var(--color-bg);
    z-index: 1;
    border-bottom: 1px solid var(--color-border);
  }

  .note-list-title {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .icon-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--color-text-muted);
    padding: 4px;
    border-radius: var(--radius-sm);
    display: grid;
    place-items: center;
    transition: background 120ms, color 120ms;
  }

  .icon-btn:hover { background: var(--color-border); color: var(--color-text); }

  .note-card {
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    font: inherit;
    transition: background 120ms;
  }

  .note-card:hover    { background: var(--color-surface); }
  .note-card.selected { background: color-mix(in srgb, var(--color-moss) 8%, var(--color-bg)); }

  .note-card-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .note-card-preview {
    font-size: 12px;
    color: var(--color-text-muted);
    margin: 0 0 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .note-card-date {
    font-size: 11px;
    color: var(--color-text-muted);
    opacity: 0.7;
  }

  /* ── Editor pane ────────────────────────────────────────────────────── */
  .editor-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-toolbar {
    border-bottom: 1px solid var(--color-border);
    padding: 8px 16px;
    height: 40px;
    display: flex;
    align-items: center;
  }

  .toolbar-placeholder {
    font-size: 11px;
    color: var(--color-text-muted);
    opacity: 0.5;
    font-style: italic;
  }

  .editor-content {
    flex: 1;
    overflow-y: auto;
    padding: 48px 64px;
    max-width: 760px;
    margin: 0 auto;
    width: 100%;
  }

  .editor-title {
    font-family: var(--font-title);
    font-size: 32px;
    font-weight: 400;
    color: var(--color-text);
    margin: 0 0 24px;
    outline: none;
    border: none;
  }

  .editor-body {
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.7;
    color: var(--color-text);
    outline: none;
    min-height: 400px;
  }
</style>
