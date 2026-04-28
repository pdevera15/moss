<script lang="ts">
  import type { Note } from '$core/types'
  import { getTagColors } from '$lib/utils/tagColors'
  import { recentSearches, searchNotes, semanticSearch, type SearchResult, type SemanticResult } from '$lib/stores/search.svelte'
  import { notesStore } from '$lib/stores/notes.svelte'

  interface Props {
    notes: Note[]
    tags: string[]
    open: boolean
    onselect: (note: Note) => void
    onclose: () => void
  }

  let { notes, tags, open, onselect, onclose }: Props = $props()

  let query       = $state('')
  let activeIdx   = $state(0)
  let inputEl     = $state<HTMLInputElement | null>(null)
  let isComposing = $state(false)
  let ftsResults      = $state<SearchResult[]>([])
  let semanticResults = $state<SemanticResult[]>([])
  let searchVersion   = 0
  let debounceTimer: ReturnType<typeof setTimeout>

  $effect(() => {
    if (open) {
      query = ''
      activeIdx = 0
      ftsResults = []
      semanticResults = []
      requestAnimationFrame(() => inputEl?.focus())
    }
  })

  $effect(() => {
    if (activeIdx >= results.length) activeIdx = 0
  })

  let tagFilters = $derived(
    tags.slice(0, 3).map(t => ({ icon: '🔍', label: `Search in ${t}`, tag: t }))
  )

  let suggestions = $derived([
    ...tagFilters,
    { icon: '📅', label: 'Notes from this week', tag: null },
    { icon: '📌', label: 'Pinned notes',          tag: null },
  ])

  function extractTags(body: string): string[] {
    const matches = body.match(/#\p{L}[\p{L}\p{N}_]*/gu) ?? []
    return [...new Set(matches.map(t => t.toLowerCase()))]
  }

  function extractPreview(body: string): string {
    const line = body.split('\n').find(l => l.trim() && !l.startsWith('#'))
    return line?.replace(/[#*`_~>\-]/g, '').trim().slice(0, 120) ?? ''
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
    semanticResults = []
    if (!q.trim()) return
    const version = ++searchVersion
    debounceTimer = setTimeout(async () => {
      const fts = await searchNotes(q)
      if (version !== searchVersion) return
      ftsResults = fts
      if (fts.length < 5) {
        const sem = await semanticSearch(q)
        if (version !== searchVersion) return
        semanticResults = sem
      }
    }, 200)
  }

  function handleSemanticSelect(result: SemanticResult) {
    const note = notesStore.notes.find(n => n.id === result.id)
    if (!note) return
    const q = query.trim()
    if (q && !recentSearches.items.includes(q)) recentSearches.push(q)
    onselect(note)
    onclose()
  }

  let results = $derived(!isComposing && query.trim() ? ftsResults.slice(0, 8) : [])

  function hl(text: string, q: string): string {
    if (!q.trim()) return esc(text)
    const i = text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase())
    if (i === -1) return esc(text)
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length))
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function handleSelect(item: SearchResult) {
    const note = notesStore.notes.find(n => n.id === item.id)
    if (!note) return
    const q = query.trim()
    if (q && !recentSearches.items.includes(q)) recentSearches.push(q)
    onselect(note)
    onclose()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return
    if (e.key === 'Escape') { e.preventDefault(); onclose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      activeIdx = Math.min(activeIdx + 1, results.length - 1)
      requestAnimationFrame(() =>
        document.querySelector('.result-row[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
      )
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      activeIdx = Math.max(activeIdx - 1, 0)
      requestAnimationFrame(() =>
        document.querySelector('.result-row[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
      )
    }
    if (e.key === 'Enter' && results[activeIdx]) {
      e.preventDefault()
      handleSelect(results[activeIdx])
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="backdrop"
    onclick={(e) => { if (e.target === e.currentTarget) onclose() }}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Search notes"
  >
    <div class="palette" role="presentation" onclick={(e) => e.stopPropagation()}>

      <!-- Input -->
      <div class="input-row">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.6"/>
          <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <input
          bind:this={inputEl}
          bind:value={query}
          oninput={() => { activeIdx = 0; if (!isComposing) triggerSearch(query) }}
          class="input"
          placeholder="Search notes…"
          autocomplete="off"
          spellcheck="false"
          oncompositionstart={() => { isComposing = true; ftsResults = [] }}
          oncompositionend={() => { isComposing = false; activeIdx = 0; triggerSearch(query) }}
        />
        {#if query}
          <button class="clear-btn" onclick={() => { query = ''; ftsResults = []; semanticResults = []; inputEl?.focus() }} aria-label="Clear">×</button>
        {/if}
        <kbd class="esc-kbd">Esc</kbd>
      </div>

      <!-- Body -->
      <div class="body">
        {#if !query.trim()}
          {#if recentSearches.items.length > 0}
            <div class="section-label">Recent</div>
            {#each recentSearches.items as s}
              <button class="list-row" onclick={() => { query = s; activeIdx = 0; triggerSearch(s); inputEl?.focus() }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 2v4l3 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
                {s}
              </button>
            {/each}
            <div class="divider"></div>
          {/if}
          <div class="section-label">Quick filters</div>
          {#each suggestions as s}
            <button class="list-row">
              <span class="list-icon">{s.icon}</span>
              {s.label}
            </button>
          {/each}
        {:else if results.length === 0 && semanticResults.length === 0}
          <div class="no-results">No notes match "{query}"</div>
        {:else}
          <div class="results">
            {#each results as result, i (result.id)}
              {@const isActive = i === activeIdx}
              {@const preview = extractPreview(result.body)}
              {@const noteTags = extractTags(result.body)}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <div
                class="result-row"
                class:active={isActive}
                data-active={isActive}
                onmouseenter={() => activeIdx = i}
                onclick={() => handleSelect(result)}
                role="option"
                tabindex="0"
                aria-selected={isActive}
              >
                <div class="result-head">
                  <span class="result-title">{@html hl(result.title || 'Untitled', query)}</span>
                  <span class="result-date">{formatDate(result.updated_at)}</span>
                </div>
                {#if preview}
                  <div class="result-preview">{@html hl(preview, query)}</div>
                {/if}
                <div class="result-tags">
                  {#each noteTags.slice(0, 3) as tag}
                    {@const c = getTagColors(tag)}
                    <span class="tag-chip" style:color={c.text} style:background={c.bg}>{tag}</span>
                  {/each}
                </div>
              </div>
            {/each}
            {#if semanticResults.length > 0}
              <div class="section-label" style="padding-top: 8px;">Similar notes</div>
              {#each semanticResults as result (result.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <div
                  class="result-row"
                  role="option"
                  tabindex="0"
                  aria-selected={false}
                  onclick={() => handleSemanticSelect(result)}
                  onkeydown={(e) => e.key === 'Enter' && handleSemanticSelect(result)}
                >
                  <div class="result-head">
                    <span class="result-title">{result.title || 'Untitled'}</span>
                    <span class="sem-score">{Math.round(result.score * 100)}%</span>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="footer">
        {#each [['↑↓', 'navigate'], ['↵', 'open'], ['Esc', 'close']] as [key, label]}
          <span class="hint">
            <kbd>{key}</kbd>
            <span>{label}</span>
          </span>
        {/each}
        {#if results.length > 0}
          <span class="result-count">{results.length} result{results.length > 1 ? 's' : ''}</span>
        {/if}
      </div>

    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(28, 27, 24, 0.35);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 72px;
    z-index: 100;
  }

  .palette {
    width: 520px;
    background: var(--color-bg);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
    overflow: hidden;
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    max-height: 480px;
  }

  /* ── Input ── */
  .input-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .search-icon { color: var(--color-text-muted); flex-shrink: 0; }

  .input {
    flex: 1;
    font-size: 15px;
    color: var(--color-text);
    background: none;
    border: none;
    outline: none;
    font-family: var(--font-body);
    min-width: 0;
  }
  .input::placeholder { color: var(--color-text-muted); }

  .clear-btn {
    background: none;
    border: none;
    font-size: 14px;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
  }

  .esc-kbd {
    font-size: 10px;
    color: var(--color-text-muted);
    background: rgba(0,0,0,0.06);
    padding: 2px 6px;
    border-radius: 5px;
    border: 1px solid var(--color-border);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  /* ── Body ── */
  .body {
    overflow-y: auto;
    max-height: 340px;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  .section-label {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 10px 16px 4px;
    font-family: var(--font-mono);
  }

  .divider {
    height: 1px;
    background: var(--color-border);
    margin: 6px 0;
  }

  .list-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 16px;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    font-size: 13px;
    color: var(--color-text-muted);
    font-family: var(--font-body);
    cursor: pointer;
    transition: background 80ms;
  }
  .list-row:hover { background: var(--color-surface); }
  .list-row svg   { color: var(--color-text-muted); flex-shrink: 0; }
  .list-icon      { font-size: 12px; }

  .no-results {
    padding: 40px 20px;
    text-align: center;
    font-size: 13px;
    color: var(--color-text-muted);
  }

  /* ── Results ── */
  .results { padding: 6px 8px; }

  .result-row {
    padding: 9px 10px;
    border-radius: 7px;
    cursor: pointer;
    transition: background 80ms;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .result-row:hover  { background: var(--color-surface); }
  .result-row.active { background: var(--color-surface-2); }

  .result-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .result-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
    flex: 1;
    font-family: var(--font-mono);
  }

  .result-date {
    font-size: 10px;
    color: var(--color-text-muted);
    flex-shrink: 0;
    font-family: var(--font-mono);
  }

  .result-preview {
    font-size: 11.5px;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-body);
  }

  .result-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .tag-chip {
    font-size: 10px;
    font-family: var(--font-mono);
    padding: 1px 5px;
    border-radius: 3px;
  }

  .sem-score {
    font-size: 9.5px;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    flex-shrink: 0;
    opacity: 0.7;
  }

  /* ── Footer ── */
  .footer {
    padding: 8px 16px;
    border-top: 1px solid var(--color-border);
    display: flex;
    gap: 14px;
    align-items: center;
    flex-shrink: 0;
  }

  .hint {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .hint kbd {
    font-size: 9.5px;
    color: var(--color-text-muted);
    background: rgba(0,0,0,0.06);
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    font-family: var(--font-mono);
  }

  .hint span {
    font-size: 10.5px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .result-count {
    margin-left: auto;
    font-size: 10.5px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  :global(mark) {
    background: rgba(196, 168, 74, 0.35);
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }
</style>
