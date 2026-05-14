import type { Extension } from '@codemirror/state'

// All visual styles live in app.css as static .cm-editor rules.
// EditorView.theme() injects styles via a dynamic <style> element which
// Tauri's WebView2 drops in production builds — global CSS is the only
// reliable path.
export const mossEditorTheme: Extension = []
