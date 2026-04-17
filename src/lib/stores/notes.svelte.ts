// src/lib/stores/notes.svelte.ts
import { invoke } from '@tauri-apps/api/core'
import type { Note } from '$core/types'

// ── Utilities ──────────────────────────────────────────────────────────────

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

// ── State ──────────────────────────────────────────────────────────────────

let activeNote = $state<Note | null>(null)
let isLoading  = $state(false)
let loadError  = $state<string | null>(null)

// ── Actions ────────────────────────────────────────────────────────────────

async function loadNote(): Promise<void> {
  isLoading = true
  loadError = null
  try {
    activeNote = await invoke<Note>('get_or_create_default_note')
  } catch (err) {
    loadError = String(err)
    console.error('Failed to load note:', err)
  } finally {
    isLoading = false
  }
}

// Fires 500ms after the last call — avoids a DB write on every keystroke
const saveNote = debounce(async (id: string, title: string, body: string): Promise<void> => {
  try {
    await invoke('save_note', { id, title, body })
  } catch (err) {
    console.error('Failed to save note:', err)
  }
}, 500)

// ── Exports ────────────────────────────────────────────────────────────────

export { activeNote, isLoading, loadError, loadNote, saveNote }
