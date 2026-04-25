# CLAUDE.md — Moss

> Read this entire file before touching any code.
> This is the single source of truth for the Moss project.

---

## What is Moss

A warm, fast, cross-platform note-taking app.
The goal: Bear's warmth and simplicity — available on every platform.

**Positioning:** Bear UI + cross-platform + plugin system + on-device semantic search + free sync
**Competing with:** Obsidian, Joplin, Inkdrop, Bear, Evernote
**Not competing with:** Notion (too complex), Apple Notes (Apple-only)

**Core promise to users:**
- Beautiful by default — no setup required
- Fast — local-first, instant open, offline always
- Private — semantic search runs on-device, nothing sent to cloud
- Open — plain markdown files, you own your data forever

---

## Tech Stack

```
Language          TypeScript everywhere (frontend, backend logic, plugins, server)
UI Framework      Svelte 5 (Runes syntax — $state, $derived, $effect)
Meta Framework    SvelteKit (SPA mode only — NO SSR, NO prerendering)
Desktop + Mobile  Tauri 2.0 (replaces both Electron and Capacitor)
Web               SvelteKit deployed to static hosting
Editor            CodeMirror 6
Database          SQLite via tauri-plugin-sql (JS side) + Rust commands (FTS5/embeddings)
ORM               Drizzle ORM (sqlite-proxy mode) — all CRUD from TypeScript uses Drizzle
Sync              Yjs + y-websocket (CRDT, works offline)
Semantic Search   Transformers.js — all-MiniLM-L6-v2 (25MB, on-device)
i18n              svelte-i18n
Styling           Tailwind CSS v4 + CSS custom properties (NO UI libraries)
Fonts             DM Serif Display, Lora, Geist Mono (via @fontsource)
Server            Node.js + Express (sync WebSocket server only)
```

---

## Project Structure

```
moss/
├── CLAUDE.md                        ← you are here
├── package.json
├── vite.config.ts                   ← Tailwind v4 plugin here
├── svelte.config.js                 ← adapter-static, SPA mode
├── tsconfig.json
│
├── src/
│   ├── app.css                      ← design tokens + @import "tailwindcss"
│   ├── app.html                     ← HTML shell
│   │
│   ├── core/                        ← pure TypeScript, ZERO Svelte/Tauri imports
│   │   ├── types/
│   │   │   └── index.ts             ← ALL shared types (Note, Task, Tag, Plugin...)
│   │   ├── notes/
│   │   │   └── index.ts             ← createNote, updateNote, extractTags, countWords
│   │   ├── tasks/
│   │   │   └── index.ts             ← createTask, buildTaskTree, rolloverLogic
│   │   ├── search/
│   │   │   └── index.ts             ← cosineSimilarity, embedText, SearchService
│   │   ├── sync/
│   │   │   └── index.ts             ← Yjs document management, SyncManager
│   │   ├── import/
│   │   │   ├── index.ts             ← ImportManager, ImportResult type
│   │   │   ├── obsidian.ts          ← import .md vault folder + wikilinks
│   │   │   ├── evernote.ts          ← import .enex XML files
│   │   │   ├── joplin.ts            ← import .jex or raw .md export
│   │   │   ├── bear.ts              ← import .bear2bk backup
│   │   │   └── markdown.ts          ← import any generic .md folder
│   │   └── plugin-api/
│   │       └── index.ts             ← Plugin, AppAPI, EventBus, PluginManager
│   │
│   ├── lib/
│   │   ├── components/              ← Svelte components (all custom, no UI library)
│   │   │   ├── Layout/
│   │   │   │   ├── AppLayout.svelte         ← picks Desktop/Mobile/Web layout
│   │   │   │   ├── DesktopLayout.svelte     ← 3-column, 208+264+flex
│   │   │   │   ├── MobileLayout.svelte      ← single panel, swipe navigation
│   │   │   │   └── WebLayout.svelte         ← responsive
│   │   │   ├── Sidebar/
│   │   │   │   └── Sidebar.svelte           ← logo, nav items, tags, user row
│   │   │   ├── NoteList/
│   │   │   │   ├── NoteList.svelte          ← header, search, list of items
│   │   │   │   └── NoteItem.svelte          ← single note row with preview
│   │   │   ├── Editor/
│   │   │   │   ├── Editor.svelte            ← CodeMirror 6 wrapper
│   │   │   │   ├── EditorHeader.svelte      ← breadcrumb, action buttons
│   │   │   │   └── StatusBar.svelte         ← word count, sync status, shortcuts
│   │   │   ├── Tasks/
│   │   │   │   ├── TaskList.svelte          ← today's tasks, rollover banner
│   │   │   │   ├── TaskItem.svelte          ← checkbox, title, subtask toggle
│   │   │   │   └── SubtaskItem.svelte       ← circle checkbox, indent
│   │   │   ├── Search/
│   │   │   │   ├── CommandPalette.svelte    ← ⌘K modal, search + commands
│   │   │   │   └── SearchResults.svelte     ← keyword + semantic result sections
│   │   │   ├── Import/
│   │   │   │   └── ImportModal.svelte       ← app picker + file selector + progress
│   │   │   └── Base/                        ← atomic components (build these first)
│   │   │       ├── Button.svelte            ← variants: primary/secondary/ghost/danger
│   │   │       ├── IconButton.svelte        ← 28x28 icon-only button
│   │   │       ├── Input.svelte             ← text input with label + focus ring
│   │   │       ├── Tag.svelte               ← pill tag, variants: moss/neutral/amber/dashed
│   │   │       ├── Modal.svelte             ← overlay + centered card
│   │   │       ├── Toast.svelte             ← bottom toast notification
│   │   │       └── Divider.svelte           ← 1px horizontal line
│   │   │
│   │   ├── stores/                          ← Svelte 5 reactive state
│   │   │   ├── notes.ts                     ← notes[], activeNote, filteredNotes
│   │   │   ├── tasks.ts                     ← todayTasks, rolledOver, taskTree
│   │   │   ├── search.ts                    ← searchQuery, searchResults, isSearching
│   │   │   ├── sync.ts                      ← syncStatus, lastSyncedAt, pendingOps
│   │   │   ├── ui.ts                        ← platform, sidebarOpen, activeTag, theme
│   │   │   └── vocab.ts                     ← vocabCards, dueForReview, streak
│   │   │
│   │   └── actions/                         ← Svelte use: actions
│   │       ├── gestures.ts                  ← swipe, longPress (mobile)
│   │       └── shortcuts.ts                 ← keyboard shortcuts (desktop)
│   │
│   ├── routes/
│   │   ├── +layout.ts                       ← prerender=false, ssr=false (REQUIRED)
│   │   ├── +layout.svelte                   ← imports app.css, mounts AppLayout
│   │   └── +page.svelte                     ← main app entry point
│   │
│   └── plugins/                             ← built-in plugins
│       ├── word-count/
│       │   └── index.ts
│       └── language-learner/
│           └── index.ts
│
├── src-tauri/                               ← Rust / Tauri (desktop + mobile)
│   ├── Cargo.toml                           ← tauri-plugin-sql, tauri-plugin-updater
│   ├── tauri.conf.json                      ← app config, window size, identifier
│   ├── capabilities/
│   │   └── default.json                     ← security permissions (opt-in only)
│   └── src/
│       ├── main.rs                          ← app entry, plugins, command registration
│       └── commands/
│           ├── notes.rs                     ← get_notes, create_note, save_note, delete_note
│           ├── tasks.rs                     ← get_tasks, create_task, complete_task, rollover
│           ├── search.rs                    ← keyword_search, save_embedding, get_embeddings
│           └── import.rs                    ← read_vault_folder, parse_enex_file
│
├── locales/                                 ← i18n translation files
│   ├── en.json                              ← English (primary)
│   ├── ja.json                              ← Japanese (launch language)
│   └── es.json                              ← Spanish (launch language)
│
└── server/                                  ← sync server (Node.js, deploy separately)
    ├── package.json
    └── src/
        ├── index.ts                         ← Express + WebSocket server
        └── sync.ts                          ← y-websocket handler + auth
```

---

## Architecture Rules — NEVER BREAK THESE

```
1. core/ has ZERO imports from lib/, src-tauri/, or plugins/
   Core is pure TypeScript business logic. No Svelte, no Tauri, no browser APIs.

2. lib/components/ imports from lib/stores/ and core/ only
   Components never call Tauri invoke() directly — stores do that.

3. lib/stores/ calls Tauri invoke() — this is the only place
   Stores are the bridge between Svelte UI and Rust backend.

4. plugins/ imports from core/plugin-api/ only
   Plugins receive AppAPI — they never touch internals.

5. NEVER call Tauri APIs in SvelteKit load() functions
   load() runs at build time. Use onMount() instead.

6. CRUD operations use Drizzle ORM — never raw SQL in TypeScript
   Schema: src/lib/db/schema.ts
   DB instance: src/lib/db/index.ts
   Migrations: src-tauri/migrations/ (generated by drizzle-kit)
   After any schema change: run `npx drizzle-kit generate`

7. FTS5 search and embeddings stay in Rust commands
   These use SQLite features Drizzle doesn't support — keep them as invoke() calls.

8. Tailwind v4 — @import "tailwindcss" in app.css, that's it
   No tailwind.config.js, no npx tailwindcss init needed.

9. SvelteKit MUST stay in SPA mode
   prerender = false and ssr = false in +layout.ts. Always.
```

---

## Svelte 5 Runes — Use This Syntax

```typescript
// State
let notes = $state<Note[]>([])
let isLoading = $state(false)
let activeNoteId = $state<string | null>(null)

// Derived (auto-recalculates)
let noteCount = $derived(notes.length)
let filteredNotes = $derived(
  notes.filter(n => n.title.includes(searchQuery))
)

// Effects (runs when deps change)
$effect(() => {
  console.log(`Active note: ${activeNoteId}`)
})

// In components — NO $: reactive statements (that's Svelte 4)
// Use $derived and $effect instead
```

---

## Tauri Commands Pattern

**Rust side (src-tauri/src/commands/notes.rs):**
```rust
#[tauri::command]
async fn get_notes(db: State<'_, DbPool>) -> Result<Vec<NoteMetadata>, String> {
    // SQL query here
    // Return Result — errors become JS exceptions
}
```

**TypeScript side (lib/stores/notes.ts):**
```typescript
import { invoke } from '@tauri-apps/api/core'

// Always in stores, never in components
async function loadNotes() {
  isLoading = true
  try {
    notes = await invoke<NoteMetadata[]>('get_notes')
  } catch (err) {
    console.error('Failed to load notes:', err)
  } finally {
    isLoading = false
  }
}
```

**Component side (lib/components/NoteList/NoteList.svelte):**
```svelte
<script>
  import { notes, loadNotes } from '$lib/stores/notes'
  import { onMount } from 'svelte'
  onMount(loadNotes)  // ← call store functions, never invoke() directly
</script>

{#each notes as note}
  <NoteItem {note} />
{/each}
```

---

## SQLite Schema

```sql
-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  is_deleted  INTEGER NOT NULL DEFAULT 0,
  is_pinned   INTEGER NOT NULL DEFAULT 0,
  word_count  INTEGER NOT NULL DEFAULT 0,
  language    TEXT NOT NULL DEFAULT 'en',
  folder_id   TEXT
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id   TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  TEXT REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id             TEXT PRIMARY KEY,
  note_id        TEXT REFERENCES notes(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'todo',
  scheduled_date INTEGER NOT NULL,
  completed_at   INTEGER,
  parent_task_id TEXT,
  position       INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

-- Embeddings (semantic search vectors)
CREATE TABLE IF NOT EXISTS embeddings (
  note_id    TEXT PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE,
  vector     BLOB NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Plugin storage (sandboxed per plugin)
CREATE TABLE IF NOT EXISTS plugin_storage (
  plugin_id  TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT,
  PRIMARY KEY (plugin_id, key)
);

-- Full text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title,
  body,
  content=notes,
  content_rowid=rowid
);
```

---

## Design System

### Colors
```css
/* Light mode */
--bg:          #FAFAF8;   /* main background — off-white */
--bg-deep:     #F4F4F2;   /* sidebar background */
--surface-1:   #EEEEEC;   /* note list background */
--surface-2:   #E8E8E5;   /* hover states */
--surface-3:   #E0E0DC;   /* active/pressed states */

--border-0:    #E8E8E4;   /* softest border */
--border-1:    #DDDDD8;   /* standard border */
--border-2:    #D0D0CA;   /* emphasis border */

--text-0:      #1E1C18;   /* primary text */
--text-1:      #3A3830;   /* secondary text */
--text-2:      #6A6760;   /* muted text */
--text-3:      #9A9790;   /* placeholder */
--text-4:      #C0BDB6;   /* disabled/ghost */

/* Moss green — primary accent */
--moss-700:    #3A5C38;
--moss-500:    #5A7F54;   /* ← main accent color */
--moss-300:    #8AAD84;
--moss-100:    #C8DEC4;
--moss-50:     #EAF3E8;

/* Amber — use SPARINGLY (cursor, starred items only) */
--amber-500:   #C4905A;
--amber-100:   #F0DFC0;
--amber-50:    #FAF0E0;

/* Functional */
--success:     #4A8C5A;
--error:       #A84848;
--warning:     #B87830;
```

### Typography
```
DM Serif Display  →  note titles, section headings, app logo
Lora              →  note body content, general reading text
Geist Mono        →  UI chrome (nav labels, meta, tags, code, status bar)
```

### Type Scale
```
38px  display        — DM Serif, letter-spacing -0.025em
30px  note-title     — DM Serif, letter-spacing -0.025em
19px  section-h2     — DM Serif, letter-spacing -0.015em
15px  note-list-title — Lora, weight 500
13.5px body          — Lora, line-height 1.85
11.5px label/tag     — Geist Mono
10px  caption/meta   — Geist Mono, letter-spacing 0.08em
```

### Spacing (8pt grid — use ONLY these values)
```
4px   --space-1    (tight gaps between related items)
8px   --space-2    (icon + label gap, inline spacing)
12px  --space-3    (component internal padding)
16px  --space-4    (standard padding)
20px  --space-5
24px  --space-6    (section gaps)
32px  --space-8    (larger sections)
40px  --space-10   (editor horizontal padding)
48px  --space-12   (page-level padding)
64px  --space-16   (very large gaps)
```

### Border Radius
```
4px   --r-sm    (tags, small elements)
7px   --r-md    (buttons, inputs, note items)
12px  --r-lg    (cards, modals)
18px  --r-xl    (app frame, large containers)
9999px --r-full (pill shapes)
```

### Layout
```
Sidebar width:   208px (fixed)
Note list width: 264px (fixed)
Editor:          flex: 1 (fills remaining)
Min app width:   800px
Min app height:  500px
```

---

## Component Rules

```
NO UI libraries — everything is custom built
NO shadcn, NO flowbite, NO skeleton, NO daisyUI

Headless behavior (keyboard nav, ARIA, focus) → Bits UI or Melt UI
Visual styling → always custom CSS with design tokens

Every component file structure:
<script lang="ts">
  // 1. imports
  // 2. props (using $props())
  // 3. stores
  // 4. local state ($state)
  // 5. derived values ($derived)
  // 6. functions
  // 7. effects ($effect)
</script>

<!-- template -->

<style>
  /* scoped styles only — use CSS variables from app.css */
</style>
```

---

## Platform Detection

```typescript
// src/lib/stores/ui.ts
type Platform = 'desktop' | 'mobile' | 'web'

function detectPlatform(): Platform {
  if (typeof window.__TAURI__ !== 'undefined') {
    return /android|iphone|ipad/i.test(navigator.userAgent)
      ? 'mobile'
      : 'desktop'
  }
  return 'web'
}

let platform = $state<Platform>(detectPlatform())
```

---

## Key Features — Priority Order

### Phase 1 — Foundation (build first)
```
✅ Tauri 2.0 + SvelteKit SPA wired together
✅ SQLite schema created via migrations in main.rs
✅ Basic CRUD: create, read, update, delete notes
✅ 3-column desktop layout
✅ Design tokens applied (colors, fonts, spacing)
✅ Light + dark mode (system default via CSS prefers-color-scheme)
```

### Phase 2 — Core Features
```
✅ CodeMirror 6 editor with markdown live preview
   ✅ Headings, bold, italic, inline code, links, blockquotes, bullets
   ✅ Fenced code blocks with background styling
   ✅ Task checkboxes (- [ ] / - [x]) with click-to-toggle
   ✅ Floating formatting toolbar (B, I, H1, H2, code, link, quote)
   ✅ Keyboard shortcuts (⌘B, ⌘I, ⌘K)
   ✅ Dark/light mode auto-switch
✅ Tag system — #hashtag extraction from note body
✅ Full-text search — SQLite FTS5
✅ Note list with search, filter by tag
   ✅ Inline search panel (Design B) — replaces note list column, scope chips, amber highlight
   ✅ Command palette ⌘K (Design A) — overlay, keyboard nav, recent searches, quick filters
✅ Daily tasks with subtasks and automatic rollover
✅ Sync status indicator (synced/syncing/offline)
```

### Phase 3 — Smart Features
```
⬜ Semantic search — Transformers.js on-device
⬜ Command palette ⌘K (already done in Phase 2)
⬜ Import from Obsidian vault folder
⬜ Import from Evernote .enex
⬜ Import from Joplin export
⬜ Yjs sync across devices
```

### Phase 4 — Plugin System + Languages
```
⬜ Plugin API + EventBus
⬜ Word count plugin (example)
⬜ Language learner plugin (furigana, vocab cards, SRS)
⬜ Multilingual editor (RTL, CJK fonts, IME support)
⬜ svelte-i18n setup (EN, JA, ES at launch)
```

### Phase 5 — Mobile + Distribution
```
⬜ Tauri 2.0 iOS build
⬜ Tauri 2.0 Android build
⬜ Mobile layout (single panel, swipe, bottom nav, FAB)
⬜ Auto-updater
⬜ App store submission
```

---

## Monetization

```
Free forever:
- Unlimited notes
- Local storage
- Semantic search
- Plugin system
- All themes
- Offline always

Pro ($4/month or $35/year):
- Sync across devices (Yjs server)
- Web clipper browser extension
- Note version history
- Priority support

Plugin Marketplace (later):
- Free community plugins
- Paid power plugins
- 20-30% revenue share
```

---

## Personas (design decisions reference)

```
Maya    — language learner, mixes Japanese + English in same note
           needs: furigana, vocab cards, spaced repetition, IME input

Kenji   — developer, needs code blocks, vim mode, fast search
           needs: syntax highlighting, keyboard shortcuts, git integration

Priya   — AI/ML researcher, dense technical notes
           needs: LaTeX math, long notes, fast search, paper linking

Carlos  — fiction writer, needs distraction-free writing
           needs: focus mode, word count goals, typewriter mode

Aisha   — student, fast capture during lectures
           needs: instant open, offline, checklists, fast search
```

---

## Important Files Reference

```
src/app.css              Design tokens + Tailwind import (touch this carefully)
src/routes/+layout.ts    MUST have prerender=false AND ssr=false
svelte.config.js         MUST use adapter-static with fallback: 'index.html'
src-tauri/tauri.conf.json Window size, app identifier, devUrl/frontendDist
src-tauri/Cargo.toml     Rust dependencies (add plugins here)
src-tauri/src/main.rs    Plugin registration + command registration
```

---

## Common Mistakes to Avoid

```
❌ Calling invoke() inside a Svelte component — do it in stores
❌ Using load() functions with Tauri APIs — use onMount() instead
❌ Running npx tailwindcss init — v4 doesn't need it
❌ Using @tailwind base/components/utilities — v4 uses @import "tailwindcss"
❌ Importing from UI libraries (shadcn, flowbite etc) — build custom
❌ Writing raw SQL strings in TypeScript — use Drizzle query builder
❌ Writing CRUD logic in Rust when Drizzle can handle it — keep Rust for FTS5/embeddings only
❌ Forgetting `npx drizzle-kit generate` after a schema change — migrations won't update
❌ Using let $: in components — that's Svelte 4, use $derived/$effect
❌ Forgetting prerender=false in +layout.ts — app breaks in Tauri
❌ Hardcoding colors — always use CSS variables from app.css
❌ Using px values not on the 8pt grid — use --space-* variables
```

---

## Dev Commands

```bash
npm run dev          # SvelteKit dev server (web only, fast)
npm run tauri dev    # Full Tauri app with hot reload (slower, use for Tauri features)
npm run build        # Build SvelteKit for production
npm run tauri build  # Build full desktop app installer
```

> Start with `npm run dev` for UI work — it's much faster.
> Switch to `npm run tauri dev` only when testing Tauri-specific features
> like SQLite, file system, or global shortcuts.

---

## Current Status

Fresh Tauri 2.0 + SvelteKit project created.
Tailwind v4 configured via @tailwindcss/vite plugin.
SQLite plugin installed.
Core TypeScript types defined.

**Next step: Build Phase 1 — get notes creating and displaying.**