import { invoke } from '@tauri-apps/api/core'

export interface SearchResult {
  id: string
  title: string
  body: string
  updated_at: number
}

export async function searchNotes(query: string): Promise<SearchResult[]> {
  const q = query.trim()
  if (!q) return []
  try {
    return await invoke<SearchResult[]>('search_notes', { query: q })
  } catch {
    return []
  }
}

class RecentSearches {
  items = $state<string[]>([])

  push(q: string) {
    if (this.items.includes(q)) return
    this.items = [q, ...this.items].slice(0, 6)
  }
}

export const recentSearches = new RecentSearches()
