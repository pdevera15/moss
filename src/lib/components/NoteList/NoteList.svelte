<script lang="ts">
  import type { Note } from "$core/types";
  import { getTagColors } from "$lib/utils/tagColors";

  interface Props {
    notes: Note[];
    activeId: string | null;
    activeTag: string | null;
    title: string;
    onselect: (note: Note) => void;
    oncreate: () => void;
    ondelete: (id: string) => void;
  }

  let { notes, activeId, activeTag, title, onselect, oncreate, ondelete }: Props = $props();

  const RECENT_DATES = new Set(["Today", "Yesterday"]);

  function stripMd(s: string): string {
    return s
      .replace(/^#{1,6}\s+/m, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/^[-*+]\s+/m, "")
      .replace(/^>\s+/m, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .trim();
  }

  function formatDate(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor(
      (now.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) / 86400000,
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatMonth(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  function extractTags(body: string): string[] {
    const matches = body.match(/#\p{L}[\p{L}\p{N}_]*/gu);
    return matches ? [...new Set(matches)].slice(0, 5) : [];
  }

  function extractPreview(body: string): string {
    const line = body.split("\n").find((l) => l.trim() && !l.startsWith("#"));
    return stripMd(line?.trim() ?? "");
  }

  function wordCount(body: string): number {
    return body.trim().split(/\s+/).filter(Boolean).length;
  }

  interface NoteRow {
    note: Note;
    displayTitle: string;
    date: string;
    month: string;
    tags: string[];
    preview: string;
    words: number;
  }

  let rows = $derived<NoteRow[]>(
    notes.map((n) => ({
      note: n,
      displayTitle:
        stripMd(n.title) ||
        stripMd(n.body.split("\n").find((l) => l.trim()) ?? "") ||
        "Untitled",
      date: formatDate(n.updated_at),
      month: formatMonth(n.updated_at),
      tags: extractTags(n.body),
      preview: extractPreview(n.body),
      words: wordCount(n.body),
    })),
  );

  interface Group {
    key: string;
    rows: NoteRow[];
  }

  function buildGroups(input: NoteRow[]): Group[] {
    const map = new Map<string, NoteRow[]>();
    for (const row of input) {
      const key = RECENT_DATES.has(row.date) ? "Recent" : row.month;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    const result: Group[] = [];
    if (map.has("Recent")) result.push({ key: "Recent", rows: map.get("Recent")! });
    for (const [key, groupRows] of map) {
      if (key !== "Recent") result.push({ key, rows: groupRows });
    }
    return result;
  }

  let groups = $derived(buildGroups(rows));
  let collapsed = $state<Record<string, boolean>>({});

  $effect(() => {
    for (const g of groups) {
      if (!(g.key in collapsed)) {
        collapsed[g.key] = g.key !== "Recent";
      }
    }
  });

  // Expand all groups when a tag filter is active so every match is visible
  $effect(() => {
    if (!activeTag) return;
    const expanded: Record<string, boolean> = {};
    for (const g of groups) expanded[g.key] = false;
    collapsed = expanded;
  });

  // When the active note changes, expand its group
  $effect(() => {
    if (!activeId) return;
    for (const g of groups) {
      if (g.rows.some((r) => r.note.id === activeId) && collapsed[g.key]) {
        collapsed = { ...collapsed, [g.key]: false };
        break;
      }
    }
  });

  function toggle(key: string) {
    collapsed = { ...collapsed, [key]: !collapsed[key] };
  }

  // ── Overflow menu ────────────────────────────────────────────────────────
  let hoverId = $state<string | null>(null);
  let openMenuId = $state<string | null>(null);
  let menuPos = $state<{ top: number; right: number } | null>(null);
  let listScrollEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    function onOutside(e: MouseEvent) {
      if (
        openMenuId &&
        !(e.target as Element)?.closest(".overflow-trigger, .overflow-menu")
      ) {
        openMenuId = null;
        menuPos = null;
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && openMenuId) {
        openMenuId = null;
        menuPos = null;
      }
    }
    window.addEventListener("mousedown", onOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onOutside);
      window.removeEventListener("keydown", onEscape);
    };
  });

  $effect(() => {
    const el = listScrollEl;
    if (!el) return;
    function onScroll() {
      openMenuId = null;
      menuPos = null;
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  });

  function toggleMenu(e: MouseEvent, id: string) {
    e.stopPropagation();
    if (openMenuId === id) {
      openMenuId = null;
      menuPos = null;
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      menuPos = { top: rect.bottom + 4, right: window.innerWidth - rect.right };
      openMenuId = id;
    }
  }

  function menuAction(e: MouseEvent, action: string, id: string) {
    e.stopPropagation();
    openMenuId = null;
    menuPos = null;
    if (action === "delete") ondelete(id);
  }
</script>

<div class="note-list">
  <div class="list-header">
    {#if activeTag}
      {@const c = getTagColors(activeTag)}
      <span class="list-title tag-active">
        <span class="tag-filter-dot" style:background={c.dot}></span>
        <span style:color={c.text}>{activeTag}</span>
      </span>
    {:else}
      <span class="list-title">{title}</span>
    {/if}
    <button class="new-btn" onclick={oncreate} aria-label="New note" title="New note">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  </div>

  <div class="list-scroll" bind:this={listScrollEl}>
    {#each groups as group (group.key)}
      <button class="group-bar" onclick={() => toggle(group.key)}>
        <span class="group-label">{group.key}</span>
        <div class="group-rule"></div>
        <span class="group-count">{group.rows.length}</span>
        <span class="chevron" class:rotated={collapsed[group.key]}>▾</span>
      </button>

      {#if !collapsed[group.key]}
        {#each group.rows as row (row.note.id)}
          {@const isActive = row.note.id === activeId}
          {@const menuOpen = openMenuId === row.note.id}
          {@const showDots = hoverId === row.note.id || isActive || menuOpen}

          <div
            class="note-row"
            class:active={isActive}
            class:menu-open={menuOpen}
            role="button"
            tabindex="0"
            onclick={() => onselect(row.note)}
            onkeydown={(e) => e.key === "Enter" && onselect(row.note)}
            onmouseenter={() => { hoverId = row.note.id; }}
            onmouseleave={() => { if (!menuOpen) hoverId = null; }}
          >
            {#if isActive}
              <div class="active-bar"></div>
            {/if}

            <div class="row-head">
              <span class="row-title">{row.displayTitle}</span>
              {#if showDots}
                <button
                  class="overflow-trigger"
                  onclick={(e) => toggleMenu(e, row.note.id)}
                  aria-label="Note options"
                  aria-expanded={menuOpen}
                >···</button>
              {:else}
                <span class="row-date">{row.date}</span>
              {/if}
            </div>

            {#if row.preview}
              <div class="row-preview">{row.preview}</div>
            {/if}

            <div class="row-foot">
              {#each row.tags.slice(0, 2) as tag}
                {@const c = getTagColors(tag)}
                <span class="tag-entry" style:color={c.text}>
                  <span class="tag-dot-sm" style:background={c.dot}></span>{tag}
                </span>
              {/each}
              {#if row.tags.length > 2}
                <span class="tag-extra">+{row.tags.length - 2}</span>
              {/if}
              <span class="row-words">{row.words}w</span>
            </div>
          </div>
        {/each}
      {/if}
    {/each}
  </div>

  <!-- position:fixed escapes overflow:hidden on the scroll container -->
  {#if openMenuId && menuPos}
    {@const menuNoteId = openMenuId}
    <div
      class="overflow-menu"
      style="top: {menuPos.top}px; right: {menuPos.right}px;"
      role="menu"
      tabindex="-1"
      onmousedown={(e) => e.stopPropagation()}
    >
      <button
        class="menu-item"
        role="menuitem"
        onclick={(e) => menuAction(e, "archive", menuNoteId)}>Archive</button
      >
      <div class="menu-divider"></div>
      <button
        class="menu-item danger"
        role="menuitem"
        onclick={(e) => menuAction(e, "delete", menuNoteId)}>Delete</button
      >
    </div>
  {/if}
</div>

<style>
  .note-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  /* ── Header ── */
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px 12px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    background: var(--color-bg);
    position: sticky;
    top: 0;
    z-index: 3;
  }

  .list-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: -0.01em;
    font-family: var(--font-mono);
  }

  .tag-active {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tag-filter-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .new-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    padding: 4px;
    border-radius: var(--radius-sm);
    display: grid;
    place-items: center;
    transition:
      background 120ms,
      color 120ms;
  }
  .new-btn:hover {
    background: var(--color-moss-tint);
    color: var(--color-moss);
  }

  /* ── Scroll container ── */
  .list-scroll {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  /* ── Group bar ── */
  .group-bar {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px 7px;
    background: rgba(0, 0, 0, 0.018);
    border: none;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    position: sticky;
    top: 0;
    z-index: 2;
    transition: background 120ms;
  }
  .group-bar:hover {
    background: rgba(0, 0, 0, 0.032);
  }

  .group-label {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    text-align: left;
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .group-rule {
    flex: 1;
    height: 1px;
    background: var(--color-border);
  }

  .group-count {
    font-size: 10px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .chevron {
    font-size: 9px;
    color: var(--color-text-muted);
    transition: transform 0.15s;
    display: inline-block;
    flex-shrink: 0;
  }
  .chevron.rotated {
    transform: rotate(-90deg);
  }

  /* ── Note row ── */
  .note-row {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    position: relative;
    transition: background 120ms;
    color: inherit;
    font: inherit;
    padding: 12px 18px;
  }
  .note-row:hover {
    background: rgba(0, 0, 0, 0.025);
  }
  .note-row.active {
    background: var(--color-surface-2);
  }
  .note-row.menu-open {
    background: var(--color-surface-2);
  }

  /* ── Active accent bar ── */
  .active-bar {
    position: absolute;
    left: 0;
    top: 10px;
    bottom: 10px;
    width: 2.5px;
    background: var(--color-moss);
    border-radius: 0 2px 2px 0;
  }

  /* ── Title + date row ── */
  .row-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
  }

  .row-title {
    flex: 1;
    min-width: 0;
    font-size: 13.5px;
    font-weight: 600;
    font-family: var(--font-body);
    color: var(--color-text);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-date {
    font-size: 10.5px;
    color: var(--color-text-muted);
    flex-shrink: 0;
    font-family: var(--font-mono);
  }

  /* ── Preview ── */
  .row-preview {
    font-size: 11.5px;
    color: var(--color-text-muted);
    line-height: 1.5;
    margin-bottom: 7px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    font-family: var(--font-body);
  }

  /* ── Footer meta row ── */
  .row-foot {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tag-entry {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .tag-dot-sm {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .tag-extra {
    font-size: 10px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .row-words {
    margin-left: auto;
    font-size: 10px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  /* ── Overflow trigger (···) ── */
  .overflow-trigger {
    background: none;
    border: none;
    padding: 1px 4px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: 13px;
    letter-spacing: 0;
    line-height: 1;
    flex-shrink: 0;
    transition:
      background 100ms,
      color 100ms;
  }
  .overflow-trigger:hover {
    background: var(--color-border);
    color: var(--color-text);
  }

  /* ── Overflow menu popover ── */
  .overflow-menu {
    position: fixed;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    padding: 4px;
    min-width: 130px;
    z-index: 200;
  }

  .menu-item {
    display: block;
    width: 100%;
    padding: 6px 11px;
    font-size: 11.5px;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    transition: background 80ms;
  }
  .menu-item:hover {
    background: var(--color-surface);
  }
  .menu-item.danger {
    color: var(--color-error, #a84848);
  }
  .menu-item.danger:hover {
    background: rgba(168, 72, 72, 0.06);
  }

  .menu-divider {
    height: 1px;
    background: var(--color-border);
    margin: 3px 0;
  }
</style>
