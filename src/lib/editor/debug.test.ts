import { describe, it, expect } from 'vitest'

describe('debug', () => {
  it('can import codemirror state', async () => {
    const { EditorState } = await import('@codemirror/state')
    expect(EditorState).toBeDefined()
  })
  it('can import codemirror view', async () => {
    const { EditorView } = await import('@codemirror/view')
    expect(EditorView).toBeDefined()
  })
  it('can create EditorState', async () => {
    const { EditorState } = await import('@codemirror/state')
    const state = EditorState.create({ doc: 'hello' })
    expect(state).toBeDefined()
  })
  it('can create EditorView', async () => {
    const { EditorState } = await import('@codemirror/state')
    const { EditorView } = await import('@codemirror/view')
    const state = EditorState.create({ doc: 'hello' })
    const parent = document.createElement('div')
    document.body.appendChild(parent)
    const view = new EditorView({ state, parent })
    expect(view).toBeDefined()
  })
})
