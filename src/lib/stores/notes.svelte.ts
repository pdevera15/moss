import { getDb } from '$lib/db'
import { notes, tags, noteTags } from '$lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { Note } from '$core/types'
import { syncStore } from '$lib/stores/sync.svelte'

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T & { cancel(): void } {
  let timer: ReturnType<typeof setTimeout>
  const d = ((...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms) }) as T & { cancel(): void }
  d.cancel = () => clearTimeout(timer)
  return d
}

function extractTags(body: string): string[] {
  const matches = body.match(/#\p{L}[\p{L}\p{N}_]*/gu) ?? []
  return [...new Set(matches.map(t => t.toLowerCase()))]
}

class NotesStore {
  notes      = $state<Note[]>([])
  activeNote = $state<Note | null>(null)
  isLoading  = $state(false)
  loadError  = $state<string | null>(null)
  tags       = $state<string[]>([])
  activeTag  = $state<string | null>(null)

  get filteredNotes(): Note[] {
    if (!this.activeTag) return this.notes
    const tag = this.activeTag
    return this.notes.filter(n => extractTags(n.body).includes(tag))
  }

  async loadNote(): Promise<void> {
    this.isLoading = true
    this.loadError = null
    try {
      const db = await getDb()
      let rows = await db.select().from(notes).orderBy(desc(notes.updated_at))
      if (rows.length === 0) {
        const note = await this._insertBlankNote()
        rows = [note]
      }
      this.notes = rows as Note[]
      this.activeNote = this.notes[0]
      await this._loadTags()
    } catch (err) {
      this.loadError = String(err)
      console.error('Failed to load notes:', err)
    } finally {
      this.isLoading = false
    }
  }

  async createNote(): Promise<void> {
    try {
      const note = await this._insertBlankNote()
      this.notes = [note as Note, ...this.notes]
      this.activeNote = note as Note
    } catch (err) {
      console.error('Failed to create note:', err)
    }
  }

  selectNote(note: Note): void {
    this.activeNote = note
  }

  setActiveTag(tag: string | null): void {
    this.activeTag = this.activeTag === tag ? null : tag
  }

  async deleteNote(id: string): Promise<void> {
    try {
      const db = await getDb()
      await db.delete(notes).where(eq(notes.id, id))
      this.notes = this.notes.filter(n => n.id !== id)
      if (this.activeNote?.id === id) {
        this.activeNote = this.notes[0] ?? null
      }
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  saveNote = debounce(async (id: string, title: string, body: string): Promise<void> => {
    try {
      const db = await getDb()
      await db.update(notes)
        .set({ title, body, updated_at: Date.now() })
        .where(eq(notes.id, id))
      const idx = this.notes.findIndex(n => n.id === id)
      if (idx !== -1) {
        this.notes[idx].title = title
        this.notes[idx].body  = body
      }
      await this._syncTags(id, body)
      await this._loadTags()
    } catch (err) {
      console.error('Failed to save note:', err)
    } finally {
      syncStore.setSynced()
    }
  }, 500)

  // ── Private helpers ───────────────────────────────────────────────────

  private async _insertBlankNote() {
    const db  = await getDb()
    const now = Date.now()
    const id  = crypto.randomUUID()
    await db.insert(notes).values({ id, title: '', body: '', created_at: now, updated_at: now })
    return { id, title: '', body: '', created_at: now, updated_at: now }
  }

  private async _syncTags(noteId: string, body: string): Promise<void> {
    const db       = await getDb()
    const extracted = extractTags(body)
    await db.delete(noteTags).where(eq(noteTags.note_id, noteId))
    for (const tag of extracted) {
      const tagId = `tag_${tag.slice(1)}`
      await db.insert(tags).values({ id: tagId, name: tag }).onConflictDoNothing()
      await db.insert(noteTags).values({ note_id: noteId, tag_id: tagId }).onConflictDoNothing()
    }
  }

  private async _loadTags(): Promise<void> {
    const db  = await getDb()
    const rows = await db
      .selectDistinct({ name: tags.name })
      .from(tags)
      .innerJoin(noteTags, eq(noteTags.tag_id, tags.id))
      .orderBy(tags.name)
    this.tags = rows.map(r => r.name)
  }
}

export const notesStore = new NotesStore()
