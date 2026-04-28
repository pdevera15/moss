<script lang="ts">
  import { onMount } from 'svelte'
  import EditorHeader from '$lib/components/Editor/EditorHeader.svelte'
  import Editor from '$lib/components/Editor/Editor.svelte'
  import StatusBar from '$lib/components/Editor/StatusBar.svelte'
  import NoteList from '$lib/components/NoteList/NoteList.svelte'
  import TaskList from '$lib/components/Tasks/TaskList.svelte'
  import { notesStore } from '$lib/stores/notes.svelte'
  import { tasksStore } from '$lib/stores/tasks.svelte'
  import { syncStore } from '$lib/stores/sync.svelte'
  import { getTagColors } from '$lib/utils/tagColors'
  import SearchPanel from '$lib/components/Search/SearchPanel.svelte'
  import CommandPalette from '$lib/components/Search/CommandPalette.svelte'
  import DevToolbar from '$lib/dev/DevToolbar.svelte'

  let activeSection  = $state<'notes' | 'tasks' | 'search'>('notes')
  let paletteOpen    = $state(false)

  function openPalette() { paletteOpen = true }

  function handleSearchSelect(note: import('$core/types').Note) {
    notesStore.selectNote(note)
    activeSection = 'notes'
  }

  // Read-only derived values for the template and word count.
  // Handlers mutate activeNote.title / activeNote.body directly (NOT these
  // derived vars — $derived is read-only), which causes these to recompute.
  let noteTitle = $derived(notesStore.activeNote?.title ?? '')
  let noteBody  = $derived(notesStore.activeNote?.body  ?? '')
  let editorEl  = $state<HTMLElement | null>(null)

  let wordCount = $derived(
    noteBody.trim().split(/\s+/).filter(Boolean).length
  )

  onMount(() => {
    notesStore.loadNote()
    tasksStore.load()

    function onGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        paletteOpen = !paletteOpen
      }
    }
    window.addEventListener('keydown', onGlobalKey)
    return () => window.removeEventListener('keydown', onGlobalKey)
  })

  // Mutate activeNote locally so $derived values stay current between
  // rapid title+body changes before the debounced save fires.
  function handleTitleChange(value: string) {
    if (!notesStore.activeNote) return
    syncStore.setSyncing()
    notesStore.activeNote.title = value
    notesStore.saveNote(notesStore.activeNote.id, value, notesStore.activeNote.body)
  }

  function handleBodyChange(value: string) {
    if (!notesStore.activeNote) return
    syncStore.setSyncing()
    notesStore.activeNote.body = value
    notesStore.saveNote(notesStore.activeNote.id, notesStore.activeNote.title, value)
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
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="3.5" cy="4.5" r="1.5" stroke="currentColor" stroke-width="1.4"/>
          <rect x="6.5" y="3.75" width="7" height="1.5" rx="0.75" fill="currentColor" opacity="0.65"/>
          <circle cx="3.5" cy="9.5" r="1.5" stroke="currentColor" stroke-width="1.4"/>
          <rect x="6.5" y="8.75" width="5" height="1.5" rx="0.75" fill="currentColor" opacity="0.65"/>
          <path d="M2.5 13.5L4 15l2.5-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
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
      {#each notesStore.tags as tag}
        {@const c = getTagColors(tag)}
        <button
          class="tag"
          class:active={notesStore.activeTag === tag}
          onclick={() => { notesStore.setActiveTag(tag); activeSection = 'notes'; }}
        >
          <span class="tag-dot" style:background={c.dot}></span>
          {tag}
        </button>
      {/each}
      {#if notesStore.tags.length === 0}
        <span class="tags-empty">No tags yet</span>
      {/if}
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

  {#if activeSection === 'tasks'}
    <!-- ── Tasks view ─────────────────────────────────────────────────── -->
    <TaskList />
  {:else}
    <!-- ── Note list / Search panel (264px) ────────────────────────────── -->
    <section class="note-list">
      {#if activeSection === 'search'}
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
          onselect={(note) => notesStore.selectNote(note)}
          oncreate={() => notesStore.createNote()}
          ondelete={(id) => notesStore.deleteNote(id)}
        />
      {/if}
    </section>

    <!-- ── Editor (flex-1) ────────────────────────────────────────────── -->
    <main class="editor-pane" bind:this={editorEl}>
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
        <StatusBar wordCount={wordCount} syncStatus={syncStore.status} />
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
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 4px 8px;
    font: inherit;
    font-size: 12px;
    color: var(--color-text);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 120ms, color 120ms;
  }

  .tag:hover  { background: var(--color-border); color: var(--color-text); }
  .tag.active { background: var(--color-moss-dark); color: #fff; font-weight: 500; }

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
    padding: 2px 8px;
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
