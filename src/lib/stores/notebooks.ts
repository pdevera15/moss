import type { Note, Notebook } from "$core/types";

export const DEFAULT_NOTEBOOK_ID = "default";
export const DEFAULT_NOTEBOOK_NAME = "Notes";

export function filterNotesByNotebook(
  notes: Note[],
  activeNotebookId: string | null,
): Note[] {
  if (!activeNotebookId) return notes;
  return notes.filter((note) => note.notebook_id === activeNotebookId);
}

export function resolveActiveNotebookId(
  notebooks: Notebook[],
  activeNotebookId: string | null,
): string | null {
  if (!activeNotebookId) return null;
  return notebooks.some((notebook) => notebook.id === activeNotebookId)
    ? activeNotebookId
    : null;
}

export function resolveNotebookForTagSelection(
  notes: Note[],
  activeNotebookId: string | null,
  tag: string,
): string | null {
  if (!activeNotebookId) return null;
  const selectedTag = tag.toLowerCase();
  return notes.some(
    (note) =>
      note.notebook_id === activeNotebookId &&
      extractTags(note.body).includes(selectedTag),
  )
    ? activeNotebookId
    : null;
}

function extractTags(body: string): string[] {
  const matches = body.match(/#\p{L}[\p{L}\p{N}_]*/gu) ?? [];
  return [...new Set(matches.map((tag) => tag.toLowerCase()))];
}

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
