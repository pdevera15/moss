# Notebook Rename/Delete + Editor Bug Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rename and delete to the notebook sidebar UI, gate delete on empty notebooks, and verify the editor click-misalignment bug is already fixed.

**Architecture:** Two new methods added to `NotesStore` in `notes.svelte.ts`; a pure `canDeleteNotebook` helper extracted into `notebooks.ts` so it can be unit-tested; the sidebar in `+page.svelte` gains a per-row "..." menu built with local Svelte state and no new component file.

**Tech Stack:** Svelte 5 Runes, Drizzle ORM (sqlite-proxy), Vitest, CodeMirror 6

---

## File Map

| File | Change |
|------|--------|
| `src/lib/stores/notebooks.ts` | Add `canDeleteNotebook` pure helper |
| `src/lib/stores/notebooks.test.ts` | Add tests for `canDeleteNotebook` |
| `src/lib/stores/notes.svelte.ts` | Add `renameNotebook` + `deleteNotebook` methods |
| `src/routes/+page.svelte` | Add `menuNotebookId` state, "..." button, dropdown, backdrop, CSS |
| `TODO.md` | Delete after confirming editor bug is fixed |

---

## Task 0: Merge base notebooks implementation

The `feat/notebook-manage` branch was cut from `master`, which does not yet have the notebooks feature. Bring it in before writing any code.

**Files:** (branch-level operation, no file edits)

- [ ] **Step 1: Merge `codex-notebooks` into this branch**

```bash
git merge codex-notebooks --no-ff -m "merge: bring in notebook base implementation"
```

Expected: fast-forward or merge commit. No conflicts anticipated — `codex-notebooks` only adds new files and columns.

- [ ] **Step 2: Verify the test suite still passes**

```bash
npx vitest run
```

Expected output (all 6 tests pass):
```
Test Files  1 passed (1)
      Tests  6 passed (6)
```

---

## Task 1: Add `canDeleteNotebook` helper + tests

Extract the "block if has notes" decision into a pure function so it can be unit-tested independently of the database.

**Files:**
- Modify: `src/lib/stores/notebooks.ts`
- Modify: `src/lib/stores/notebooks.test.ts`

- [ ] **Step 1: Add failing tests**

Open `src/lib/stores/notebooks.test.ts` and append after the last `describe` block:

```typescript
describe("canDeleteNotebook", () => {
  it("allows deleting a notebook with no notes", () => {
    const notes = [note("a", "work")];
    expect(canDeleteNotebook(notes, "personal")).toEqual({ ok: true });
  });

  it("blocks deleting a notebook that has notes (plural)", () => {
    const notes = [note("a", "work"), note("b", "work")];
    const result = canDeleteNotebook(notes, "work");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/2 notes/);
    }
  });

  it("blocks with singular 'note' for exactly one note", () => {
    const notes = [note("a", "work")];
    const result = canDeleteNotebook(notes, "work");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/1 note[^s]/);
    }
  });
});
```

Also add `canDeleteNotebook` to the import line at the top of the test file:

```typescript
import {
  DEFAULT_NOTEBOOK_NAME,
  filterNotesByNotebook,
  resolveNotebookForTagSelection,
  resolveActiveNotebookId,
  canDeleteNotebook,
} from "./notebooks";
```

- [ ] **Step 2: Run tests — expect 3 failures**

```bash
npx vitest run src/lib/stores/notebooks.test.ts
```

Expected: 6 pass, 3 fail with `canDeleteNotebook is not a function`.

- [ ] **Step 3: Add `canDeleteNotebook` to `notebooks.ts`**

Append to the end of `src/lib/stores/notebooks.ts`:

```typescript
export function canDeleteNotebook(
  notes: Note[],
  notebookId: string,
): { ok: true } | { ok: false; error: string } {
  const count = notes.filter((n) => n.notebook_id === notebookId).length;
  if (count > 0) {
    return {
      ok: false,
      error: `Move or delete the ${count} note${count === 1 ? "" : "s"} in this notebook first.`,
    };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run tests — expect all 9 to pass**

```bash
npx vitest run src/lib/stores/notebooks.test.ts
```

Expected output:
```
Test Files  1 passed (1)
      Tests  9 passed (9)
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/notebooks.ts src/lib/stores/notebooks.test.ts
git commit -m "feat(notes): add canDeleteNotebook helper with tests"
```

---

## Task 2: Add `renameNotebook` to `NotesStore`

**Files:**
- Modify: `src/lib/stores/notes.svelte.ts`

- [ ] **Step 1: Add the import for `canDeleteNotebook`**

In `src/lib/stores/notes.svelte.ts`, find the existing import from `"$lib/stores/notebooks"`:

```typescript
import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_NOTEBOOK_NAME,
  filterNotesByNotebook,
  resolveActiveNotebookId,
  resolveNotebookForTagSelection,
} from "$lib/stores/notebooks";
```

Replace it with:

```typescript
import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_NOTEBOOK_NAME,
  canDeleteNotebook,
  filterNotesByNotebook,
  resolveActiveNotebookId,
  resolveNotebookForTagSelection,
} from "$lib/stores/notebooks";
```

- [ ] **Step 2: Add `renameNotebook` method to `NotesStore`**

Inside the `class NotesStore` body, after the `createNotebook` method, add:

```typescript
async renameNotebook(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    const db = await getDb();
    const now = Date.now();
    await db
      .update(notebooksTable)
      .set({ name: trimmed, updated_at: now })
      .where(eq(notebooksTable.id, id));
    const idx = this.notebooks.findIndex((nb) => nb.id === id);
    if (idx !== -1) {
      this.notebooks[idx].name = trimmed;
      this.notebooks[idx].updated_at = now;
    }
  } catch (err) {
    console.error("Failed to rename notebook:", err);
  }
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add src/lib/stores/notes.svelte.ts
git commit -m "feat(notes): add renameNotebook store method"
```

---

## Task 3: Add `deleteNotebook` to `NotesStore`

**Files:**
- Modify: `src/lib/stores/notes.svelte.ts`

- [ ] **Step 1: Add `deleteNotebook` method after `renameNotebook`**

```typescript
async deleteNotebook(id: string): Promise<{ error: string } | void> {
  if (id === DEFAULT_NOTEBOOK_ID) return;
  const check = canDeleteNotebook(this.notes, id);
  if (!check.ok) return { error: check.error };
  try {
    const db = await getDb();
    await db.delete(notebooksTable).where(eq(notebooksTable.id, id));
    this.notebooks = this.notebooks.filter((nb) => nb.id !== id);
    if (this.activeNotebookId === id) {
      this.activeNotebookId = null;
      this.activeNote = this.filteredNotes[0] ?? null;
    }
  } catch (err) {
    console.error("Failed to delete notebook:", err);
  }
}
```

Note: `eq` and `notebooksTable` are already imported at the top of the file.

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: 9 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stores/notes.svelte.ts
git commit -m "feat(notes): add deleteNotebook store method, block on non-empty"
```

---

## Task 4: Add notebook "..." menu to sidebar UI

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add `menuNotebookId` state and helper functions**

In the `<script>` block of `src/routes/+page.svelte`, after the `settingsOpen` state declaration, add:

```typescript
let menuNotebookId = $state<string | null>(null);

function openNotebookMenu(e: MouseEvent, id: string) {
  e.stopPropagation();
  menuNotebookId = menuNotebookId === id ? null : id;
}

async function handleRenameNotebook(id: string, currentName: string) {
  const name = window.prompt("Rename notebook", currentName);
  if (!name?.trim()) return;
  await notesStore.renameNotebook(id, name.trim());
  menuNotebookId = null;
}

async function handleDeleteNotebook(id: string) {
  const count = notesStore.notes.filter((n) => n.notebook_id === id).length;
  if (count > 0) {
    window.alert(
      `Move or delete the ${count} note${count === 1 ? "" : "s"} in this notebook first.`,
    );
    return;
  }
  if (!window.confirm("Delete this notebook?")) return;
  await notesStore.deleteNotebook(id);
  menuNotebookId = null;
}
```

Also add the `DEFAULT_NOTEBOOK_ID` import at the top of the script (alongside the existing notesStore import):

```typescript
import { notesStore } from "$lib/stores/notes.svelte";
import { DEFAULT_NOTEBOOK_ID } from "$lib/stores/notebooks";
```

- [ ] **Step 2: Restructure the notebook rows**

Find the `{#each notesStore.notebooks as notebook}` block (around line 229) and replace it entirely with:

```svelte
{#each notesStore.notebooks as notebook}
  {@const nbColor = notebookColor(notebook.id)}
  {@const isActive = notesStore.activeNotebookId === notebook.id}
  {@const nbCount = notesStore.notes.filter((n) => n.notebook_id === notebook.id).length}
  {@const isDefault = notebook.id === DEFAULT_NOTEBOOK_ID}
  {@const menuOpen = menuNotebookId === notebook.id}
  <div class="nb-row-wrap">
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
    {#if !isDefault}
      <button
        class="nb-menu-btn"
        class:open={menuOpen}
        onclick={(e) => openNotebookMenu(e, notebook.id)}
        aria-label="Notebook options"
        title="Notebook options"
      >···</button>
      {#if menuOpen}
        <div class="nb-menu" role="menu">
          <button
            class="nb-menu-item"
            role="menuitem"
            onclick={() => handleRenameNotebook(notebook.id, notebook.name)}
          >Rename</button>
          <button
            class="nb-menu-item nb-menu-item--danger"
            role="menuitem"
            onclick={() => handleDeleteNotebook(notebook.id)}
          >Delete</button>
        </div>
      {/if}
    {/if}
  </div>
{/each}
```

- [ ] **Step 3: Add the click-outside backdrop**

Just before the closing `</div>` of `.app-shell` (the very last `</div>` before `<CommandPalette>`), add:

```svelte
{#if menuNotebookId !== null}
  <div
    class="nb-menu-backdrop"
    role="none"
    onclick={() => (menuNotebookId = null)}
  ></div>
{/if}
```

- [ ] **Step 4: Add CSS for the new elements**

In the `<style>` block, append after the `.nb-row.active .nb-name` rule:

```css
/* ── Notebook row wrapper ── */
.nb-row-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.nb-row-wrap .nb-row {
  flex: 1;
  min-width: 0;
}

/* ── Notebook "..." menu button ── */
.nb-menu-btn {
  position: absolute;
  right: 8px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 0.5px;
  line-height: 1;
  display: grid;
  place-items: center;
  padding: 0;
  opacity: 0;
  z-index: 15;
  transition: opacity 120ms, background 120ms;
}

.nb-row-wrap:hover .nb-menu-btn,
.nb-menu-btn.open {
  opacity: 1;
}

.nb-menu-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

/* ── Notebook dropdown menu ── */
.nb-menu {
  position: absolute;
  right: 6px;
  top: calc(100% + 2px);
  z-index: 20;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 120px;
  padding: 4px;
  display: flex;
  flex-direction: column;
}

.nb-menu-item {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  font-size: 12px;
  color: var(--color-text);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 100ms;
}

.nb-menu-item:hover {
  background: var(--color-surface-2);
}

.nb-menu-item--danger {
  color: var(--error);
}

/* ── Backdrop (click-outside to close menu) ── */
.nb-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
}
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat(ui): add rename and delete menu to notebook sidebar rows"
```

---

## Task 5: Manual smoke-test

Start the dev server and verify all three notebook management actions work.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open the browser at `http://localhost:5173`.

- [ ] **Step 2: Test "..." button visibility**

- Hover over a user-created notebook → "···" button appears.
- Hover over the default "Notes" notebook → no "···" button appears.
- Move cursor away → "···" button disappears.

- [ ] **Step 3: Test Rename**

- Click "···" on a notebook → dropdown appears with Rename and Delete.
- Click Rename → browser prompt appears pre-filled with the current name.
- Enter a new name → dropdown closes, sidebar shows updated name.
- Click Rename again → enter nothing / press Cancel → name unchanged.

- [ ] **Step 4: Test Delete (blocked)**

- Create a notebook, add a note to it (Ctrl+N while that notebook is selected).
- Hover the notebook → click "···" → click Delete.
- Expected: `window.alert` appears saying "Move or delete the 1 note in this notebook first." Notebook is NOT removed.

- [ ] **Step 5: Test Delete (allowed)**

- Switch to All Notes. Delete the note you just created.
- Go back to the now-empty notebook → "···" → Delete.
- Expected: `window.confirm` — click OK → notebook disappears, view resets to All Notes.

- [ ] **Step 6: Test click-outside**

- Open a notebook menu → click anywhere outside the dropdown → menu closes.

---

## Task 6: Verify editor click bug

The CSS fix (padding moved from `.cm-scroller` to `.cm-content`/`.cm-line`) appears to be already applied. This task confirms it.

**Files:**
- Delete: `TODO.md` (if bug is confirmed fixed)

- [ ] **Step 1: Open a long note**

In the running dev server, open or create a note with at least 25 lines of text.

- [ ] **Step 2: Test click accuracy**

Click on line 5, then line 15, then line 25. Verify the cursor lands exactly on the line you clicked, not one or two lines away. Press the Up arrow — verify it moves exactly one line.

- [ ] **Step 3a: If bug is fixed — delete TODO.md and commit**

```bash
git rm TODO.md
git commit -m "chore: remove stale editor click bug TODO (already fixed)"
```

- [ ] **Step 3b: If bug still occurs — investigate**

Check whether removing the `requestAnimationFrame` wrapper in `Editor.svelte` (line 128) helps:

Find:
```typescript
EditorView.updateListener.of((update) => {
  if (
    !update.docChanged &&
    !update.selectionSet &&
    !update.viewportChanged
  )
    return;
  requestAnimationFrame(() => update.view.requestMeasure());
}),
```

Replace with (remove the `requestAnimationFrame` wrapper):
```typescript
EditorView.updateListener.of((update) => {
  if (
    !update.docChanged &&
    !update.selectionSet &&
    !update.viewportChanged
  )
    return;
  update.view.requestMeasure();
}),
```

Re-test click accuracy. If fixed, commit. If still broken, revert and escalate — the root cause is not the padding.

---

## Task 7: Final check and clean up

- [ ] **Step 1: Run full test suite one last time**

```bash
npx vitest run
```

Expected: 9 tests pass.

- [ ] **Step 2: TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Review git log**

```bash
git log --oneline feat/notebook-manage ^master
```

Expected commits (in order):
```
chore: remove stale editor click bug TODO (already fixed)   ← or the fix commit
feat(ui): add rename and delete menu to notebook sidebar rows
feat(notes): add deleteNotebook store method, block on non-empty
feat(notes): add renameNotebook store method
feat(notes): add canDeleteNotebook helper with tests
merge: bring in notebook base implementation
```
