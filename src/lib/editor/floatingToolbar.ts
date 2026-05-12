import { ViewPlugin, type ViewUpdate, EditorView } from "@codemirror/view";
import { EditorSelection, Prec } from "@codemirror/state";
import type { KeyBinding } from "@codemirror/view";

type FormatAction = {
  label: string;
  title: string;
  wrap: [string, string];
};

const ACTIONS: FormatAction[] = [
  { label: "B", title: "Bold (⌘B)", wrap: ["**", "**"] },
  { label: "I", title: "Italic (⌘I)", wrap: ["_", "_"] },
  { label: "H1", title: "Heading 1", wrap: ["# ", ""] },
  { label: "H2", title: "Heading 2", wrap: ["## ", ""] },
  { label: "`", title: "Inline code", wrap: ["`", "`"] },
  { label: "🔗", title: "Link", wrap: ["[", "](url)"] },
  { label: "❝", title: "Blockquote", wrap: ["> ", ""] },
];

export function applyWrap(
  view: EditorView,
  before: string,
  after: string,
): void {
  view.dispatch(
    view.state.changeByRange((range) => ({
      changes: [
        { from: range.from, insert: before },
        { from: range.to, insert: after },
      ],
      range: EditorSelection.range(
        range.from + before.length,
        range.to + before.length,
      ),
    })),
  );
  view.focus();
}

function buildToolbar(view: EditorView): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "cm-moss-float-toolbar";
  bar.setAttribute("aria-label", "Text formatting");

  ACTIONS.forEach((action, i) => {
    if (i === 2 || i === 4) {
      const div = document.createElement("div");
      div.className = "cm-moss-float-divider";
      bar.appendChild(div);
    }
    const btn = document.createElement("button");
    btn.className = "cm-moss-float-btn";
    btn.title = action.title;
    btn.textContent = action.label;
    btn.setAttribute("type", "button");
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      applyWrap(view, action.wrap[0], action.wrap[1]);
    });
    bar.appendChild(btn);
  });

  return bar;
}

function positionToolbar(bar: HTMLElement, view: EditorView): void {
  const sel = view.state.selection.main;
  const startCoords = view.coordsAtPos(sel.from);
  const endCoords = view.coordsAtPos(sel.to);
  if (!startCoords || !endCoords) return;

  const editorRect = view.dom.getBoundingClientRect();
  const barHalf = bar.offsetWidth / 2;
  const margin = 8;
  const rawX = (startCoords.left + endCoords.right) / 2 - editorRect.left;
  // Clamp so the toolbar never overflows the editor's left or right edge.
  const midX = Math.min(
    editorRect.width - barHalf - margin,
    Math.max(barHalf + margin, rawX),
  );
  const topY = startCoords.top - editorRect.top - 48;

  bar.style.left = `${midX}px`;
  bar.style.top = `${Math.max(4, topY)}px`;
  bar.style.transform = "translateX(-50%)";
}

export const markdownKeymap: KeyBinding[] = [
  {
    key: "Mod-b",
    run: (view) => {
      applyWrap(view, "**", "**");
      return true;
    },
  },
  {
    key: "Mod-i",
    run: (view) => {
      applyWrap(view, "_", "_");
      return true;
    },
  },
  {
    key: "Mod-k",
    run: (view) => {
      applyWrap(view, "[", "](url)");
      return true;
    },
  },
];

// True while the primary mouse button is held down inside the editor.
// Used to defer toolbar creation until mouseup so we don't insert DOM nodes
// mid-drag (which interrupts the browser's native drag-to-select gesture and
// collapses the selection).
let _mouseSelecting = false;

export const floatingToolbar = ViewPlugin.fromClass(
  class {
    toolbar: HTMLElement | null = null;
    private onPointerUp: (e: PointerEvent) => void;

    constructor(view: EditorView) {
      // Listen on document so we catch mouseup even when the pointer is
      // released outside the editor (e.g. right-to-left drag past the edge).
      this.onPointerUp = (e: PointerEvent) => {
        if (e.button !== 0 || !_mouseSelecting) return;
        _mouseSelecting = false;
        view.dispatch({});
      };
      document.addEventListener("pointerup", this.onPointerUp);
    }

    update(update: ViewUpdate) {
      const sel = update.view.state.selection.main;

      if (sel.empty) {
        this.toolbar?.remove();
        this.toolbar = null;
        return;
      }

      // Don't CREATE the toolbar while the user is still dragging to select —
      // appending a DOM node mid-drag collapses the selection in WebView2.
      // If the toolbar already exists (e.g. from a prior keyboard selection),
      // keep repositioning it so it tracks the live selection.
      if (_mouseSelecting) {
        if (this.toolbar) {
          const toolbar = this.toolbar;
          const view = update.view;
          requestAnimationFrame(() => positionToolbar(toolbar, view));
        }
        return;
      }

      if (!this.toolbar) {
        this.toolbar = buildToolbar(update.view);
        this.toolbar.style.position = "absolute";
        update.view.dom.style.position = "relative";
        update.view.dom.appendChild(this.toolbar);
      }

      const toolbar = this.toolbar;
      const view = update.view;
      requestAnimationFrame(() => positionToolbar(toolbar, view));
    }

    destroy() {
      this.toolbar?.remove();
      document.removeEventListener("pointerup", this.onPointerUp);
    }
  },
);

// Prec.highest so these handlers fire before CodeMirror's own mousedown logic.
export const rightClickGuard = Prec.highest(
  EditorView.domEventHandlers({
    mousedown(event: MouseEvent) {
      if (event.button === 2) return true; // block right-click from clearing selection
      if (event.button === 0) _mouseSelecting = true;
    },
  }),
);
