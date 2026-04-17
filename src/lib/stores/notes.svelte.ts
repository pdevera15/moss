import { invoke } from '@tauri-apps/api/core'
import type { Note } from '$core/types'

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

class NotesStore {
  activeNote = $state<Note | null>(null)
  isLoading  = $state(false)
  loadError  = $state<string | null>(null)

  async loadNote(): Promise<void> {
    this.isLoading = true
    this.loadError = null
    try {
      this.activeNote = await invoke<Note>('get_or_create_default_note')
    } catch (err) {
      this.loadError = String(err)
      console.error('Failed to load note:', err)
    } finally {
      this.isLoading = false
    }
  }

  saveNote = debounce(async (id: string, title: string, body: string): Promise<void> => {
    try {
      await invoke('save_note', { id, title, body })
    } catch (err) {
      console.error('Failed to save note:', err)
    }
  }, 500)
}

export const notesStore = new NotesStore()
