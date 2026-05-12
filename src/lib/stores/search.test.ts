import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("embedNote", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("calls embed_note with correct args", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockResolvedValue(undefined);

    const { embedNote } = await import("./search.svelte");
    await embedNote("note-1", "My Title", "My body");

    expect(mockInvoke).toHaveBeenCalledWith("embed_note", {
      noteId: "note-1",
      title: "My Title",
      body: "My body",
    });
  });

  it("swallows invoke errors without throwing", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("model not ready"));

    const { embedNote } = await import("./search.svelte");
    await expect(embedNote("note-1", "title", "body")).resolves.toBeUndefined();
  });
});

describe("semanticSearch", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns [] without calling invoke for empty query", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const mockInvoke = vi.mocked(invoke);

    const { semanticSearch } = await import("./search.svelte");
    const result = await semanticSearch("   ");

    expect(result).toEqual([]);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("calls semantic_search with trimmed query", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const mockResults = [{ id: "n1", title: "Note 1", score: 0.85 }];
    vi.mocked(invoke).mockResolvedValue(mockResults);

    const { semanticSearch } = await import("./search.svelte");
    const result = await semanticSearch("  deep work  ");

    expect(vi.mocked(invoke)).toHaveBeenCalledWith("semantic_search", {
      query: "deep work",
    });
    expect(result).toEqual(mockResults);
  });

  it("returns [] on invoke error", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("DB error"));

    const { semanticSearch } = await import("./search.svelte");
    const result = await semanticSearch("test query");

    expect(result).toEqual([]);
  });
});
