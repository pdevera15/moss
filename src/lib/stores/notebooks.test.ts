import { describe, expect, it } from "vitest";
import type { Note, Notebook } from "$core/types";
import {
  DEFAULT_NOTEBOOK_NAME,
  filterNotesByNotebook,
  resolveNotebookForTagSelection,
  resolveActiveNotebookId,
} from "./notebooks";

const now = 1_700_000_000_000;

function note(id: string, notebook_id: string | null): Note {
  return {
    id,
    title: id,
    body: "",
    created_at: now,
    updated_at: now,
    language: "en",
    notebook_id,
  };
}

function taggedNote(id: string, notebook_id: string | null, tag: string): Note {
  return {
    ...note(id, notebook_id),
    body: `body ${tag}`,
  };
}

function notebook(id: string, name = id): Notebook {
  return {
    id,
    name,
    position: 0,
    created_at: now,
    updated_at: now,
  };
}

describe("notebook note filtering", () => {
  it("returns every note when All Notes is selected", () => {
    const notes = [note("a", "work"), note("b", "home"), note("c", null)];

    expect(filterNotesByNotebook(notes, null)).toEqual(notes);
  });

  it("returns only notes in the selected notebook", () => {
    const notes = [note("a", "work"), note("b", "home"), note("c", null)];

    expect(filterNotesByNotebook(notes, "work")).toEqual([notes[0]]);
  });
});

describe("active notebook resolution", () => {
  it("keeps the active notebook when it still exists", () => {
    const notebooks = [notebook("default", DEFAULT_NOTEBOOK_NAME)];

    expect(resolveActiveNotebookId(notebooks, "default")).toBe("default");
  });

  it("falls back to All Notes when the active notebook no longer exists", () => {
    const notebooks = [notebook("default", DEFAULT_NOTEBOOK_NAME)];

    expect(resolveActiveNotebookId(notebooks, "missing")).toBeNull();
  });
});

describe("tag notebook resolution", () => {
  it("keeps the active notebook when that notebook has the selected tag", () => {
    const notes = [
      taggedNote("a", "work", "#ideas"),
      taggedNote("b", "home", "#journal"),
    ];

    expect(resolveNotebookForTagSelection(notes, "work", "#ideas")).toBe(
      "work",
    );
  });

  it("switches to All Notes when the active notebook does not have the selected tag", () => {
    const notes = [
      taggedNote("a", "work", "#ideas"),
      taggedNote("b", "home", "#journal"),
    ];

    expect(resolveNotebookForTagSelection(notes, "work", "#journal")).toBeNull();
  });
});
