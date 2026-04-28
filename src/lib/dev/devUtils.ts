import { getDb } from '$lib/db'
import { notes } from '$lib/db/schema'
import { embedNote } from '$lib/stores/search.svelte'

export async function reEmbedAllNotes(): Promise<void> {
  const db = await getDb()
  const rows = await db.select({ id: notes.id, title: notes.title, body: notes.body }).from(notes)
  for (const row of rows) {
    embedNote(row.id, row.title, row.body)
  }
}
