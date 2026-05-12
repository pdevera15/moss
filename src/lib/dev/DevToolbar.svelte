<script lang="ts">
  let embedMsg = $state("");
  let seedMsg = $state("");

  async function handleReEmbed() {
    embedMsg = "…";
    try {
      const { reEmbedAllNotes } = await import("./devUtils");
      await reEmbedAllNotes();
      embedMsg = "✓";
    } catch {
      embedMsg = "!";
    } finally {
      setTimeout(() => {
        embedMsg = "";
      }, 2000);
    }
  }

  async function handleSeedJapanese() {
    seedMsg = "…";
    try {
      const { seedJapaneseNotes } = await import("./seedJapaneseNotes");
      await seedJapaneseNotes();
      seedMsg = "✓";
      window.location.reload();
    } catch {
      seedMsg = "!";
    } finally {
      setTimeout(() => {
        seedMsg = "";
      }, 2000);
    }
  }

  let x = $state(window.innerWidth - 160);
  let y = $state(window.innerHeight - 56);
  let dragging = $state(false);
  let ox = 0,
    oy = 0;

  function onmousedown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    dragging = true;
    ox = e.clientX - x;
    oy = e.clientY - y;
    e.preventDefault();
  }

  function onmousemove(e: MouseEvent) {
    if (!dragging) return;
    x = Math.max(0, Math.min(window.innerWidth - 10, e.clientX - ox));
    y = Math.max(0, Math.min(window.innerHeight - 10, e.clientY - oy));
  }

  function onmouseup() {
    dragging = false;
  }
</script>

<svelte:window {onmousemove} {onmouseup} />

<div
  class="dev-toolbar"
  class:dragging
  style:left="{x}px"
  style:top="{y}px"
  role="toolbar"
  tabindex="-1"
  {onmousedown}
>
  <span class="dev-badge">DEV</span>

  <button class="dev-btn" onclick={handleReEmbed} title="Re-embed all notes">
    <span class="icon">{embedMsg || "⟳"}</span>
    <span class="label">re-embed</span>
  </button>

  <button
    class="dev-btn"
    onclick={handleSeedJapanese}
    title="Seed Japanese test notes"
  >
    <span class="icon">{seedMsg || "🇯🇵"}</span>
    <span class="label">seed JP</span>
  </button>
</div>

<style>
  .dev-toolbar {
    position: fixed;
    display: flex;
    align-items: center;
    gap: 4px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 5px 8px;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    font-family: var(--font-mono);
  }

  .dev-toolbar {
    cursor: grab;
  }
  .dev-toolbar.dragging {
    cursor: grabbing;
    user-select: none;
  }

  .dev-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #f59e0b;
    padding-right: 6px;
    border-right: 1px solid #333;
    margin-right: 2px;
  }

  .dev-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 3px 7px;
    border-radius: 5px;
    color: #aaa;
    transition:
      background 120ms,
      color 120ms;
    line-height: 1;
  }

  .dev-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  .dev-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .icon {
    font-size: 13px;
  }

  .label {
    font-size: 10px;
    letter-spacing: 0.02em;
  }
</style>
