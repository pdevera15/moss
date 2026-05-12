<script lang="ts">
  import { onMount } from "svelte";
  import { check } from "@tauri-apps/plugin-updater";

  let updateAvailable = $state(false);
  let updateVersion = $state("");
  let updateNotes = $state("");
  let installing = $state(false);
  let installed = $state(false);
  let updateHandle: Awaited<ReturnType<typeof check>> = null;

  onMount(async () => {
    // macOS updates are not supported (requires Apple notarization)
    if (/mac/i.test(navigator.platform)) return;

    try {
      const update = await check();
      if (update) {
        updateHandle = update;
        updateVersion = update.version;
        updateNotes = update.body ?? "";
        updateAvailable = true;
      }
    } catch {
      // silently ignore — network offline or no release yet
    }
  });

  async function installUpdate() {
    if (!updateHandle) return;
    installing = true;
    try {
      await updateHandle.downloadAndInstall();
      installed = true;
    } catch {
      installing = false;
    }
  }

  function dismiss() {
    updateAvailable = false;
  }
</script>

{#if updateAvailable}
  <div class="update-banner">
    <div class="update-info">
      <span class="update-text">Moss {updateVersion} is available</span>
      {#if updateNotes}
        <span class="update-notes">{updateNotes}</span>
      {/if}
    </div>
    <div class="update-actions">
      {#if installed}
        <span class="installed-note">Restart to apply</span>
      {:else}
        <button
          class="btn-install"
          onclick={installUpdate}
          disabled={installing}
        >
          {installing ? "Installing…" : "Update"}
        </button>
      {/if}
      <button class="btn-dismiss" onclick={dismiss} aria-label="Dismiss">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M1 1l10 10M11 1L1 11"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .update-banner {
    position: fixed;
    bottom: 32px;
    right: 20px;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .update-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .update-text {
    font-size: 12.5px;
    font-family: var(--font-mono);
    color: var(--color-text);
  }

  .update-notes {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    max-width: 280px;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .update-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .btn-install {
    font-size: 12px;
    font-family: var(--font-mono);
    padding: 4px 10px;
    background: var(--color-moss);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: opacity 120ms;
  }

  .btn-install:hover:not(:disabled) {
    opacity: 0.85;
  }
  .btn-install:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .btn-dismiss {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    padding: 0;
    transition: color 120ms;
  }

  .btn-dismiss:hover {
    color: var(--color-text);
  }

  .installed-note {
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
  }
</style>
