# Notebook Rename/Delete + Editor Click Bug

**Date:** 2026-07-14
**Branch:** codex-notebooks
**Status:** Approved for implementation

---

## Scope

Two independent changes shipped together:

1. **Notebook rename and delete** — complete the notebook management UI that was started in the previous session (create already works).
2. **Editor click misalignment** — verify the bug described in `TODO.md` is already fixed; remove the stale doc if so.

---

## 1. Notebook Rename & Delete

### Constraints established in design

- Trigger: hover over a notebook row → "..." button appears → clicking it opens an inline dropdown with "Rename" and "Delete".
- The default "Notes" notebook (`id === 'default'`) shows no "..." button — it is permanently locked (neither renameable nor deletable).
- Delete is blocked (not destructive): if the notebook contains any notes, show an alert and abort. The user must move or delete the notes first.
- No new component file — all logic stays in `src/routes/+page.svelte` where the notebook rows already live.

### Store additions — `NotesStore` in `src/lib/stores/notes.svelte.ts`

**`renameNotebook(id: string, name: string): Promise<void>`**
- Trim `name`; return early if empty.
- Drizzle: `UPDATE notebooks SET name = ?, updated_at = ? WHERE id = ?`
- Update the matching entry in `this.notebooks` in-place.

**`deleteNotebook(id: string): Promise<{ error: string } | void>`**
- Return early (no-op) if `id === DEFAULT_NOTEBOOK_ID`.
- Count `this.notes` where `notebook_id === id`. If count > 0, return `{ error: 'Move or delete the notes in this notebook first.' }`.
- Drizzle: `DELETE FROM notebooks WHERE id = ?`
- Remove from `this.notebooks`.
- If `this.activeNotebookId === id`, reset `this.activeNotebookId = null` (All Notes).

### UI additions — `src/routes/+page.svelte`

**New local state:**
```ts
let menuNotebookId = $state<string | null>(null)
```

**Template changes inside `{#each notesStore.notebooks as notebook}`:**
- Add a `.nb-menu-btn` ("...") button to each row, **skipped** when `notebook.id === DEFAULT_NOTEBOOK_ID`.
- CSS: button is `opacity: 0` by default, `opacity: 1` on `.nb-row:hover` and when the menu is open for that row.
- Clicking the button: `menuNotebookId = menuNotebookId === notebook.id ? null : notebook.id`
- When `menuNotebookId === notebook.id`, render a `.nb-menu` dropdown below the button with two items:
  - **Rename** → `window.prompt('Rename notebook', notebook.name)` → if result is non-empty, call `notesStore.renameNotebook(notebook.id, result)` → then `menuNotebookId = null`
  - **Delete** → call `notesStore.deleteNotebook(notebook.id)` → if it returns an error, `window.alert(error)` (menu stays open) → otherwise `menuNotebookId = null`

**Click-outside to close:**
- A `.nb-menu-backdrop` `<div>` (fixed, full-screen, `z-index` below the menu) renders when `menuNotebookId !== null`.
- Clicking it sets `menuNotebookId = null`.

**CSS additions (scoped in `<style>`):**
- `.nb-menu-btn` — 18×18px, same style as `.nb-add`, rendered as the last flex child of `.nb-row` (no absolute positioning needed — the row is already `display: flex`), `opacity: 0` by default, `margin-left: auto` to push it to the right.
- `.nb-row:hover .nb-menu-btn`, `.nb-menu-btn.open` — `opacity: 1`.
- `.nb-menu` — small absolute dropdown card, `background: var(--color-bg)`, `border: 1px solid var(--color-border)`, `border-radius: var(--r-md)`, `box-shadow: 0 4px 12px rgba(0,0,0,0.1)`.
- `.nb-menu-item` — full-width button, `font-size: 12px`, hover background, "Delete" item gets `color: var(--error)`.
- `.nb-menu-backdrop` — `position: fixed; inset: 0; z-index: 10;` transparent.

---

## 2. Editor Click Misalignment Bug

### Current state (from reading `src/app.css`)

The fix described in `TODO.md` is **already applied**:
- `.cm-scroller` — no padding ✅
- `.cm-content` — `padding: var(--editor-page-padding) 0` (48px top/bottom, 0 horizontal) ✅
- `.cm-line` — `padding: 0 var(--editor-line-padding)` (0 vertical, 64px horizontal) ✅
- Font-load remeasure — `document.fonts.ready` + `loadingdone` listener in `Editor.svelte` ✅

### Implementation task

1. Run `npm run dev` and manually test: open a long note, click on lines at the bottom — verify cursor lands on the correct line.
2. If the bug is confirmed fixed: delete `TODO.md`.
3. If the bug still occurs: investigate. Likely remaining cause is the `requestAnimationFrame` inside the `updateListener` (line 128 of `Editor.svelte`) interfering with CM6's own measure scheduling. Fix would be to remove that `requestAnimationFrame` wrapper and call `requestMeasure()` directly, or remove it entirely since the fonts listener covers the primary use case.

---

## Files touched

| File | Change |
|------|--------|
| `src/lib/stores/notes.svelte.ts` | Add `renameNotebook`, `deleteNotebook` methods |
| `src/routes/+page.svelte` | Add `menuNotebookId` state, "..." button, dropdown, backdrop, CSS |
| `TODO.md` | Delete if editor bug is confirmed fixed |

---

## Testing

- Create a notebook → hover it → "..." appears, default "Notes" notebook shows no "...".
- Rename: prompt prefills current name, empty/cancel is a no-op, name updates in sidebar.
- Delete: notebook with notes shows alert, empty notebook shows confirm dialog, on confirm it disappears and active view switches to All Notes.
- Click accuracy: click the 20th line of a long note — cursor lands there, not on a different line.
- Run `npx vitest run` — all 6 notebook tests still pass.
