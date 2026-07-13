<script lang="ts">
  import { onMount } from "svelte";
  import EditorHeader from "$lib/components/Editor/EditorHeader.svelte";
  import Editor from "$lib/components/Editor/Editor.svelte";
  import StatusBar from "$lib/components/Editor/StatusBar.svelte";
  import NoteList from "$lib/components/NoteList/NoteList.svelte";
  import TaskList from "$lib/components/Tasks/TaskList.svelte";
  import { notesStore } from "$lib/stores/notes.svelte";
  import { tasksStore } from "$lib/stores/tasks.svelte";
  import { syncStore } from "$lib/stores/sync.svelte";
  import { getTagColors } from "$lib/utils/tagColors";
  import SearchPanel from "$lib/components/Search/SearchPanel.svelte";
  import CommandPalette from "$lib/components/Search/CommandPalette.svelte";
  import DevToolbar from "$lib/dev/DevToolbar.svelte";
  import UpdateBanner from "$lib/components/Base/UpdateBanner.svelte";
  import SettingsModal from "$lib/components/Settings/SettingsModal.svelte";

  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

  let activeSection = $state<"notes" | "tasks" | "search">("notes");
  let paletteOpen = $state(false);
  let settingsOpen = $state(false);

  function openPalette() {
    paletteOpen = true;
  }

  function handleSearchSelect(note: import("$core/types").Note) {
    notesStore.selectNote(note);
    activeSection = "notes";
  }

  function createNotebook() {
    const name = window.prompt("Notebook name");
    if (!name) return;
    notesStore.createNotebook(name);
    activeSection = "notes";
  }

  const NOTEBOOK_PALETTE = [
    "#3b6840", "#b8923a", "#3b5c6e", "#9a5c33",
    "#6e4a7a", "#7a3b3b", "#3b6458", "#5a5850",
  ];

  function notebookColor(id: string): string {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return NOTEBOOK_PALETTE[h % NOTEBOOK_PALETTE.length];
  }

  // Read-only derived values for the template and word count.
  // Handlers mutate activeNote.title / activeNote.body directly (NOT these
  // derived vars — $derived is read-only), which causes these to recompute.
  let noteTitle = $derived(notesStore.activeNote?.title ?? "");
  let noteBody = $derived(notesStore.activeNote?.body ?? "");
  let editorEl = $state<HTMLElement | null>(null);

  let wordCount = $derived(noteBody.trim().split(/\s+/).filter(Boolean).length);

  onMount(() => {
    notesStore.loadNote();
    tasksStore.load();

    function onGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        paletteOpen = !paletteOpen;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        notesStore.createNote();
      }
    }
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  });

  // Mutate activeNote locally so $derived values stay current between
  // rapid title+body changes before the debounced save fires.
  function handleTitleChange(value: string) {
    if (!notesStore.activeNote) return;
    syncStore.setSyncing();
    notesStore.activeNote.title = value;
    notesStore.saveNote(
      notesStore.activeNote.id,
      value,
      notesStore.activeNote.body,
    );
  }

  function handleBodyChange(value: string) {
    if (!notesStore.activeNote) return;
    syncStore.setSyncing();
    notesStore.activeNote.body = value;
    notesStore.saveNote(
      notesStore.activeNote.id,
      notesStore.activeNote.title,
      value,
    );
  }
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
        class:active={activeSection === "notes"}
        onclick={() => (activeSection = "notes")}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        Notes
      </button>

      <button
        class="nav-item"
        class:active={activeSection === "tasks"}
        onclick={() => (activeSection = "tasks")}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle
            cx="3.5"
            cy="4.5"
            r="1.5"
            stroke="currentColor"
            stroke-width="1.4"
          />
          <rect
            x="6.5"
            y="3.75"
            width="7"
            height="1.5"
            rx="0.75"
            fill="currentColor"
            opacity="0.65"
          />
          <circle
            cx="3.5"
            cy="9.5"
            r="1.5"
            stroke="currentColor"
            stroke-width="1.4"
          />
          <rect
            x="6.5"
            y="8.75"
            width="5"
            height="1.5"
            rx="0.75"
            fill="currentColor"
            opacity="0.65"
          />
          <path
            d="M2.5 13.5L4 15l2.5-3.5"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Tasks
      </button>

      <button
        class="nav-item"
        class:active={activeSection === "search"}
        onclick={() => (activeSection = "search")}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Search
      </button>
    </nav>

    <div class="sidebar-sections">
      <!-- Library -->
      <div class="nb-section-head">Library</div>
      <button
        class="nb-row"
        class:active={notesStore.activeNotebookId === null}
        onclick={() => { notesStore.setActiveNotebook(null); activeSection = "notes"; }}
      >
        <span class="nb-twist" style="opacity:0">▸</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="nb-glyph"
          style:color={notesStore.activeNotebookId === null ? "rgba(255,255,255,0.9)" : "var(--color-text-muted)"}>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" stroke="currentColor" stroke-width="1.3"/>
          <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
        </svg>
        <span class="nb-name">All Notes</span>
        <span class="nb-count" class:active={notesStore.activeNotebookId === null}>{notesStore.notes.length}</span>
      </button>

      <!-- Notebooks -->
      <div class="nb-section-head nb-section-head--add">
        <span>Notebooks</span>
        <button class="nb-add" onclick={createNotebook} aria-label="New notebook" title="New notebook">+</button>
      </div>
      {#each notesStore.notebooks as notebook}
        {@const nbColor = notebookColor(notebook.id)}
        {@const isActive = notesStore.activeNotebookId === notebook.id}
        {@const nbCount = notesStore.notes.filter((n) => n.notebook_id === notebook.id).length}
        <button
          class="nb-row"
          class:active={isActive}
          onclick={() => { notesStore.setActiveNotebook(notebook.id); activeSection = "notes"; }}
        >
          <span class="nb-twist" style="opacity:0">▸</span>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" class="nb-glyph">
            <rect x="3" y="2" width="10" height="12" rx="1.4"
              fill={isActive ? "rgba(255,255,255,0.18)" : nbColor}
              fill-opacity={isActive ? "1" : "0.14"}
              stroke={isActive ? "rgba(255,255,255,0.9)" : nbColor}
              stroke-width="1.3"/>
            <line x1="5.4" y1="2" x2="5.4" y2="14"
              stroke={isActive ? "rgba(255,255,255,0.9)" : nbColor}
              stroke-width="1.3"/>
          </svg>
          <span class="nb-name">{notebook.name}</span>
          <span class="nb-count" class:active={isActive}>{nbCount}</span>
        </button>
      {/each}

      <!-- Tags -->
      <div class="nb-section-head" style="margin-top: 8px;">Tags</div>
      {#each notesStore.tags as tag}
        {@const c = getTagColors(tag)}
        <button
          class="nb-tag"
          class:active={notesStore.activeTag === tag}
          onclick={() => { notesStore.setActiveTag(tag); activeSection = "notes"; }}
        >
          <span class="tag-dot" style:background={c.dot}></span>
          <span style:color={notesStore.activeTag === tag ? "inherit" : c.text}>{tag}</span>
        </button>
      {/each}
      {#if notesStore.tags.length === 0}
        <span class="tags-empty">No tags yet</span>
      {/if}
    </div>

    <div class="sidebar-footer">
      <button class="nav-item" onclick={() => (settingsOpen = true)}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
        </svg>
        Settings
      </button>
    </div>
  </aside>

  {#if activeSection === "tasks"}
    <!-- ── Tasks view ─────────────────────────────────────────────────── -->
    <TaskList />
  {:else}
    <!-- ── Note list / Search panel (264px) ────────────────────────────── -->
    <section class="note-list">
      {#if activeSection === "search"}
        <SearchPanel
          notes={notesStore.notes}
          tags={notesStore.tags}
          onselect={handleSearchSelect}
        />
      {:else}
        <NoteList
          notes={notesStore.filteredNotes}
          activeId={notesStore.activeNote?.id ?? null}
          activeTag={notesStore.activeTag}
          title={notesStore.activeNotebookName}
          onselect={(note) => notesStore.selectNote(note)}
          oncreate={() => notesStore.createNote()}
          ondelete={(id) => notesStore.deleteNote(id)}
        />
      {/if}
    </section>

    <!-- ── Editor (flex-1) ────────────────────────────────────────────── -->
    <main
      class="editor-pane"
      bind:this={editorEl}
      lang={notesStore.activeNote?.language ?? "en"}
    >
      {#if notesStore.isLoading}
        <div class="editor-state">Loading…</div>
      {:else if notesStore.loadError}
        <div class="editor-state editor-state--error">
          Failed to load note: {notesStore.loadError}
        </div>
      {:else}
        {#key notesStore.activeNote?.id}
          <EditorHeader
            title={noteTitle}
            ontitlechange={handleTitleChange}
            editorElement={editorEl}
          />
          <Editor
            value={noteBody}
            onchange={handleBodyChange}
            placeholder="Start writing…"
          />
        {/key}
        <StatusBar {wordCount} syncStatus={syncStore.status} />
      {/if}
    </main>
  {/if}
</div>

<CommandPalette
  notes={notesStore.notes}
  tags={notesStore.tags}
  open={paletteOpen}
  onselect={handleSearchSelect}
  onclose={() => (paletteOpen = false)}
/>

{#if import.meta.env.DEV}
  <DevToolbar />
{/if}

{#if isTauri}
  <UpdateBanner />
{/if}

<SettingsModal bind:open={settingsOpen} />

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
    transition:
      background 120ms,
      color 120ms;
  }

  .nav-item:hover {
    background: var(--color-border);
    color: var(--color-text);
  }
  .nav-item.active {
    background: var(--color-moss);
    color: #fff;
  }

  .sidebar-sections {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  /* ── Section headings ── */
  .nb-section-head {
    display: flex;
    align-items: center;
    padding: 12px 16px 5px;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .nb-section-head--add {
    justify-content: space-between;
  }

  .nb-add {
    width: 18px;
    height: 18px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1;
    display: grid;
    place-items: center;
    padding: 0;
  }
  .nb-add:hover {
    background: var(--color-border);
    color: var(--color-text);
  }

  /* ── Notebook rows (Option B) ── */
  .nb-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 1px 6px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    border: none;
    background: transparent;
    color: var(--color-text);
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
    width: calc(100% - 12px);
    text-align: left;
    transition:
      background 120ms,
      color 120ms;
  }
  .nb-row:hover {
    background: rgba(0, 0, 0, 0.035);
  }
  .nb-row.active {
    background: var(--color-moss-dark);
    color: #fff;
  }

  .nb-twist {
    font-size: 9px;
    color: var(--color-text-muted);
    width: 10px;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.12s;
  }
  .nb-row.active .nb-twist {
    color: rgba(255, 255, 255, 0.7);
  }

  .nb-glyph {
    flex-shrink: 0;
    display: flex;
  }

  .nb-name {
    flex: 1;
    min-width: 0;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nb-row.active .nb-name {
    font-weight: 600;
  }

  .nb-count {
    font-size: 10.5px;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    min-width: 14px;
    text-align: right;
    flex-shrink: 0;
  }
  .nb-count.active {
    color: rgba(255, 255, 255, 0.75);
  }

  /* ── Tag rows ── */
  .nb-tag {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 1px 6px;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    border: none;
    background: transparent;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    width: calc(100% - 12px);
    text-align: left;
    transition:
      background 120ms,
      color 120ms;
  }
  .nb-tag:hover {
    background: var(--color-border);
  }
  .nb-tag.active {
    background: var(--color-moss-dark);
    color: #fff;
    font-weight: 500;
  }

  .tag-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .tags-empty {
    font-size: 11px;
    color: var(--color-text-muted);
    opacity: 0.6;
    padding: 2px 14px;
  }

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
    overflow: hidden;
  }

  /* ── Editor pane ────────────────────────────────────────────────────── */
  .editor-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    cursor: text;
    background: var(--color-bg);
  }

  .editor-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .editor-state--error {
    color: var(--error);
  }
</style>
