<script lang="ts">
  let {
    wordCount = 0,
    syncStatus = "synced",
  }: {
    wordCount?: number;
    syncStatus?: "synced" | "syncing" | "offline";
  } = $props();

  const syncLabel = $derived(
    syncStatus === "synced"
      ? "Synced"
      : syncStatus === "syncing"
        ? "Syncing…"
        : "Offline",
  );

  const syncColor = $derived(
    syncStatus === "synced"
      ? "var(--color-moss)"
      : syncStatus === "syncing"
        ? "var(--color-amber)"
        : "var(--color-text-faint)",
  );
</script>

<div class="status-bar">
  <span class="status-left">
    {wordCount}
    {wordCount === 1 ? "word" : "words"}
  </span>
  <span class="status-right">
    <span class="sync-dot" style="background: {syncColor}"></span>
    <span>{syncLabel}</span>
    <span class="divider">·</span>
    <span>⌘K command palette</span>
  </span>
</div>

<style>
  .status-bar {
    height: 32px;
    border-top: 1px solid var(--color-border);
    padding: 0 var(--space-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-text-faint);
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .status-left,
  .status-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .sync-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .divider {
    opacity: 0.4;
  }
</style>
