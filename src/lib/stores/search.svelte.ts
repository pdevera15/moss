import { invoke } from "@tauri-apps/api/core";
import { getDb } from "$lib/db";
import { notes } from "$lib/db/schema";

export interface SearchResult {
  id: string;
  title: string;
  body: string;
  updated_at: number;
}

export async function searchNotes(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    return await invoke<SearchResult[]>("search_notes", { query: q });
  } catch {
    return [];
  }
}

export interface SemanticResult {
  id: string;
  title: string;
  score: number;
}

export async function embedNote(
  noteId: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    await invoke("embed_note", { noteId, title, body });
  } catch {
    // fire-and-forget — embedding failure never blocks the user
  }
}

export async function checkReindexNeeded(): Promise<boolean> {
  try {
    return await invoke<boolean>("check_reindex_needed");
  } catch {
    return false;
  }
}

export async function reindexAllEmbeddings(): Promise<void> {
  const db = await getDb();
  const rows = await db
    .select({ id: notes.id, title: notes.title, body: notes.body })
    .from(notes);
  for (const row of rows) {
    await embedNote(row.id, row.title, row.body);
  }
}

export async function semanticSearch(query: string): Promise<SemanticResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    return await invoke<SemanticResult[]>("semantic_search", { query: q });
  } catch {
    return [];
  }
}

class RecentSearches {
  items = $state<string[]>([]);

  push(q: string) {
    if (this.items.includes(q)) return;
    this.items = [q, ...this.items].slice(0, 6);
  }
}

export const recentSearches = new RecentSearches();
