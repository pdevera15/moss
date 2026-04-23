<script lang="ts">
  import { onMount } from 'svelte'
  import type { Note } from '$core/types'
  import { getTagColors } from '$lib/utils/tagColors'
  import { recentSearches, searchNotes, type SearchResult } from '$lib/stores/search.svelte'
  import { notesStore } from '$lib/stores/notes.svelte'

  interface Props {
    notes: Note[]
    tags: string[]
    onselect: (note: Note) => void
  }

  let { notes, tags, onselect }: Props = $props()

  type ResultItem = { id: string; title: string; body: string; updated_at: number }

  let query       = $state('')
  let scope       = $state('All')
  let activeId    = $state<string | null>(null)
  let inputEl     = $state<HTMLInputElement | null>(null)
  let isComposing = $state(false)
  let ftsResults  = $state<SearchResult[]>([])
  let debounceTimer: ReturnType<typeof setTimeout>

  onMount(() => inputEl?.focus())

  let scopes = $derived(['All', ...tags.slice(0, 4)])

  function extractTags(body: string): string[] {
    const matches = body.match(/#\p{L}[\p{L}\p{N}_]*/gu) ?? []
    return [...new Set(matches.map(t => t.toLocaleLowerCase()))]
  }

  function extractPreview(body: string): string {
    const line = body.split('\n').find(l => l.trim() && !l.startsWith('#'))
    return line?.replace(/[#*`_~>\-]/g, '').trim().slice(0, 100) ?? ''
  }

  function formatDate(ts: number): string {
    const diffDays = Math.floor((Date.now() - ts) / 86400000)
    if (diffDays < 1)  return 'Today'
    if (diffDays < 2)  return 'Yesterday'
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function triggerSearch(q: string) {
    clearTimeout(debounceTimer)
    ftsResults = []
    if (!q.trim()) return
    debounceTimer = setTimeout(async () => {
      ftsResults = await searchNotes(q)
    }, 200)
  }

  let results = $derived<ResultItem[]>(
    (() => {
      const q = query.trim()
      const scopeFilter = (arr: ResultItem[]) =>
        scope === 'All' ? arr : arr.filter(n => extractTags(n.body).includes(scope))

      if (!q) return scope === 'All' ? [] : scopeFilter(notes).slice(0, 8)
      return scopeFilter(ftsResults).slice(0, 8)
    })()
  )

  let showIdle = $derived(!query.trim() && scope === 'All')

  function hl(text: string, q: string): string {
    if (!q.trim()) return esc(text)
    const i = text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase())
    if (i === -1) return esc(text)
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length))
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function handleSelect(item: ResultItem) {
    const note = notesStore.notes.find(n => n.id === item.id)
    if (!note) return
    const q = query.trim()
    if (q && !recentSearches.items.includes(q)) recentSearches.push(q)
    onselect(note)
  }

  function useRecent(s: string) {
    query = s
    triggerSearch(s)
    inputEl?.focus()
  }
</script>

<div class="search-panel">
  <!-- Input -->
  <div class="input-wrap">
    <div class="input-row">
      <svg class="icon" width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/>
        <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <input
        bind:this={inputEl}
        bind:value={query}
        class="input"
        placeholder="Search…"
        autocomplete="off"
        spellcheck="false"
        oninput={() => { if (!isComposing) triggerSearch(query) }}
        oncompositionstart={() => { isComposing = true; ftsResults = [] }}
        oncompositionend={() => { isComposing = false; triggerSearch(query) }}
      />
      {#if query}
        <button class="clear-btn" onclick={() => { query = ''; ftsResults = []; inputEl?.focus() }} aria-label="Clear">×</button>
      {/if}
    </div>
  </div>

  <!-- Scope chips -->
  {#if tags.length > 0}
    <div class="scopes">
      {#each scopes as s}
        {@const isTag = s.startsWith('#')}
        {@const c = isTag ? getTagColors(s) : null}
        <button
          class="scope-chip"
          class:active={scope === s}
          style:--chip-color={scope === s ? '#fff' : (c?.text ?? 'var(--color-text-muted)')}
          onclick={() => { scope = s }}
        >
          {s}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Body -->
  <div class="body">
    {#if showIdle}
      <!-- Recent searches -->
      {#if recentSearches.items.length > 0}
        <div class="section-label">Recent</div>
        {#each recentSearches.items as s}
          <button class="recent-row" onclick={() => useRecent(s)}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 2v4l3 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            {s}
          </button>
        {/each}
      {:else}
        <div class="empty-hint">Start typing to search…</div>
      {/if}
    {:else if results.length === 0}
      <div class="no-results">No results in {scope}</div>
    {:else}
      {#each results as result (result.id)}
        {@const isActive = result.id === activeId}
        {@const noteTags = extractTags(result.body)}
        {@const preview = extractPreview(result.body)}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div
          class="result-row"
          class:active={isActive}
          onmouseenter={() => activeId = result.id}
          onmouseleave={() => activeId = null}
          onclick={() => handleSelect(result)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && handleSelect(result)}
        >
          {#if isActive}
            <div class="active-bar"></div>
          {/if}
          <div class="result-title">{@html hl(result.title || 'Untitled', query)}</div>
          {#if preview}
            <div class="result-preview">{@html hl(preview, query)}</div>
          {/if}
          <div class="result-footer">
            <div class="result-tags">
              {#each noteTags.slice(0, 3) as tag}
                {@const c = getTagColors(tag)}
                <span class="tag-chip" style:color={c.text} style:background={c.bg}>{tag}</span>
              {/each}
            </div>
            <span class="result-date">{formatDate(result.updated_at)}</span>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Footer count -->
  {#if query.trim() && results.length > 0}
    <div class="footer">
      {results.length} result{results.length > 1 ? 's' : ''}
    </div>
  {/if}
</div>

<style>
  .search-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  /* ── Input ── */
  .input-wrap {
    padding: 10px 12px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 7px;
    background: var(--color-surface);
    border-radius: 7px;
    padding: 7px 10px;
  }

  .icon {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .input {
    flex: 1;
    font-size: 13px;
    color: var(--color-text);
    background: none;
    border: none;
    outline: none;
    font-family: var(--font-mono);
    min-width: 0;
  }

  .input::placeholder { color: var(--color-text-muted); }

  .clear-btn {
    background: none;
    border: none;
    font-size: 14px;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
  }

  /* ── Scopes ── */
  .scopes {
    display: flex;
    gap: 5px;
    padding: 7px 12px;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .scope-chip {
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 11px;
    font-family: var(--font-mono);
    border: none;
    cursor: pointer;
    background: rgba(0,0,0,0.06);
    color: var(--chip-color, var(--color-text-muted));
    font-weight: 400;
    transition: background 100ms, color 100ms;
    white-space: nowrap;
  }

  .scope-chip.active {
    background: var(--color-moss);
    color: #fff;
    font-weight: 500;
  }

  /* ── Body ── */
  .body {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  .section-label {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 12px 14px 6px;
    font-family: var(--font-mono);
  }

  .recent-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    font-size: 12px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    cursor: pointer;
    border-radius: 5px;
    transition: background 100ms;
  }
  .recent-row:hover { background: var(--color-surface); }
  .recent-row svg { color: var(--color-text-muted); flex-shrink: 0; }

  .empty-hint {
    padding: 32px 16px;
    text-align: center;
    font-size: 12px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .no-results {
    padding: 32px 16px;
    text-align: center;
    font-size: 12px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  /* ── Result rows ── */
  .result-row {
    padding: 10px 14px;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    position: relative;
    transition: background 100ms;
  }
  .result-row:hover  { background: var(--color-surface); }
  .result-row.active { background: var(--color-surface-2); }

  .active-bar {
    position: absolute;
    left: 0; top: 7px; bottom: 7px;
    width: 2.5px;
    background: var(--color-moss);
    border-radius: 0 2px 2px 0;
  }

  .result-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 3px;
    line-height: 1.3;
    font-family: var(--font-mono);
  }

  .result-preview {
    font-size: 11px;
    color: var(--color-text-muted);
    line-height: 1.45;
    margin-bottom: 5px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    font-family: var(--font-body);
  }

  .result-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .result-tags {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
  }

  .tag-chip {
    font-size: 10px;
    font-family: var(--font-mono);
    padding: 1px 5px;
    border-radius: 3px;
  }

  .result-date {
    font-size: 10px;
    color: var(--color-text-muted);
    flex-shrink: 0;
    font-family: var(--font-mono);
  }

  /* ── Footer ── */
  .footer {
    padding: 6px 14px;
    border-top: 1px solid var(--color-border);
    font-size: 10.5px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  /* Amber highlight */
  :global(mark) {
    background: rgba(196, 168, 74, 0.35);
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }
</style>
