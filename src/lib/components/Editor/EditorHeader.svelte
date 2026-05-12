<script lang="ts">
  let {
    title = $bindable(""),
    ontitlechange,
    editorElement,
  }: {
    title?: string;
    ontitlechange?: (value: string) => void;
    editorElement?: HTMLElement | null;
  } = $props();

  function handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    title = value;
    ontitlechange?.(value);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      editorElement?.querySelector<HTMLElement>(".cm-content")?.focus();
    }
  }
</script>

<div class="editor-header">
  <input
    class="title-input"
    type="text"
    value={title}
    placeholder="Untitled"
    spellcheck="false"
    oninput={handleInput}
    onkeydown={handleKeydown}
    aria-label="Note title"
  />
</div>

<style>
  .editor-header {
    padding: var(--space-12) var(--space-16) var(--space-6);
    border-bottom: 1px solid var(--color-border);
    max-width: calc(760px + var(--space-16) * 2);
    margin: 0 auto;
    width: 100%;
  }

  .title-input {
    display: block;
    width: 100%;
    font-family: var(--font-title);
    font-size: 30px;
    font-weight: 400;
    letter-spacing: -0.025em;
    color: var(--color-text);
    background: transparent;
    border: none;
    outline: none;
    padding: 0;
    margin: 0;
    line-height: 1.2;
  }

  .title-input::placeholder {
    color: var(--color-text-faint);
  }
</style>
