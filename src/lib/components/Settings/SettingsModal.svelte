<script lang="ts">
  import { onMount } from 'svelte'
  import { check } from '@tauri-apps/plugin-updater'
  import { invoke } from '@tauri-apps/api/core'
  import { getVersion } from '@tauri-apps/api/app'

  let { open = $bindable(false), onclose }: {
    open: boolean
    onclose?: () => void
  } = $props()

  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

  type UpdaterState = 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error'
  type NavId = 'updates' | 'about'

  let activeNav      = $state<NavId>('updates')
  let updateState    = $state<UpdaterState>('checking')
  let currentVersion = $state('—')
  let latestVersion  = $state('')
  let releaseNotes   = $state('')
  let releaseDate    = $state('')
  let downloadPct    = $state(0)
  let downloadedMB   = $state(0)
  let totalMB        = $state(0)
  let lastChecked    = $state('—')
  let errorMsg       = $state('')
  let autoUpdate     = $state(true)
  let updateHandle   = $state<Awaited<ReturnType<typeof check>> | null>(null)

  // Content header labels per nav item
  const HEADER: Record<NavId, { eyebrow: string; title: string }> = {
    updates: { eyebrow: 'Updates', title: 'App version' },
    about:   { eyebrow: 'About',   title: 'Moss'        },
  }

  onMount(async () => {
    if (!isTauri) {
      currentVersion = '0.2.0'
      updateState    = 'up-to-date'
      lastChecked    = 'just now'
      return
    }
    try { currentVersion = await getVersion() } catch { /* ignore */ }
    await checkForUpdates()
  })

  async function checkForUpdates() {
    updateState = 'checking'
    lastChecked = '…'
    errorMsg    = ''
    try {
      const update = await check()
      lastChecked = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      if (update?.available) {
        updateHandle  = update
        latestVersion = update.version ?? ''
        releaseNotes  = update.body ?? ''
        releaseDate   = update.date
          ? new Date(update.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : ''
        updateState = 'available'
      } else {
        updateState = 'up-to-date'
      }
    } catch (e) {
      updateState = 'error'
      errorMsg    = e instanceof Error ? e.message : String(e)
      lastChecked = 'unavailable'
    }
  }

  async function startDownload() {
    if (!updateHandle) return
    updateState  = 'downloading'
    downloadPct  = 0
    downloadedMB = 0
    totalMB      = 0
    try {
      await updateHandle.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          totalMB = (event.data.contentLength ?? 0) / 1_048_576
        } else if (event.event === 'Progress') {
          downloadedMB += event.data.chunkLength / 1_048_576
          downloadPct = totalMB > 0
            ? Math.min(99, Math.round((downloadedMB / totalMB) * 100))
            : 0
        } else if (event.event === 'Finished') {
          downloadPct = 100
          updateState = 'ready'
        }
      })
    } catch (e) {
      updateState = 'error'
      errorMsg    = e instanceof Error ? e.message : 'Download failed. Please try again.'
    }
  }

  async function restartNow() {
    try {
      // tauri-plugin-process: silently falls back if not registered.
      // On Windows/NSIS, downloadAndInstall already staged the update;
      // relaunching applies it.
      await invoke('plugin:process|relaunch')
    } catch {
      // Plugin not available — instruct user to restart manually
      errorMsg    = 'Please close and reopen Moss to apply the update.'
      updateState = 'ready'
    }
  }

  function closeModal() {
    open = false
    onclose?.()
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeModal()
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <div class="backdrop" onclick={closeModal} role="presentation"></div>

  <div class="dialog" role="dialog" aria-modal="true" aria-label="Settings">

    <!-- ── Left nav ────────────────────────────────────────────────────── -->
    <nav class="settings-nav">
      <div class="nav-logo">
        <span class="nav-logo-mark">M</span>
        <span class="nav-logo-text">Settings</span>
      </div>

      <button class="nav-btn" class:active={activeNav === 'updates'} onclick={() => (activeNav = 'updates')}>
        Updates
      </button>
      <button class="nav-btn" class:active={activeNav === 'about'} onclick={() => (activeNav = 'about')}>
        About
      </button>

      <div class="nav-spacer"></div>
      <div class="nav-version">moss · v{currentVersion}</div>
    </nav>

    <!-- ── Content ─────────────────────────────────────────────────────── -->
    <div class="content">

      <div class="content-header">
        <div class="content-eyebrow">{HEADER[activeNav].eyebrow}</div>
        <h2 class="content-title">{HEADER[activeNav].title}</h2>
      </div>

      <div class="content-body">

        <!-- ════════════════ UPDATES PANEL ════════════════ -->
        {#if activeNav === 'updates'}

          <!-- Version hero -->
          <div class="version-block">
            <div class="moss-mark"><span>M</span></div>
            <div class="version-info">
              <div class="version-row">
                <span class="app-name">Moss</span>
                <span class="version-num">v{currentVersion}</span>

                {#if updateState === 'checking'}
                  <span class="pill pill--neutral"><span class="pill-dot"></span>Checking…</span>
                {:else if updateState === 'up-to-date'}
                  <span class="pill pill--success"><span class="pill-dot"></span>Up to date</span>
                {:else if updateState === 'available'}
                  <span class="pill pill--amber"><span class="pill-dot"></span>Update available</span>
                {:else if updateState === 'downloading'}
                  <span class="pill pill--info"><span class="pill-dot"></span>Downloading</span>
                {:else if updateState === 'ready'}
                  <span class="pill pill--success"><span class="pill-dot"></span>Ready to install</span>
                {:else if updateState === 'error'}
                  <span class="pill pill--error"><span class="pill-dot"></span>Error</span>
                {/if}
              </div>

              <div class="version-sub">
                {#if updateState === 'checking'}
                  Checking for updates…
                {:else if updateState === 'up-to-date'}
                  You're on the latest stable release.{#if releaseDate}&nbsp;<span class="sub-muted">Released {releaseDate}.</span>{/if}
                {:else if updateState === 'available'}
                  A new version is ready to download — <strong>v{latestVersion}</strong>{#if releaseDate}&nbsp;· released {releaseDate}{/if}.
                {:else if updateState === 'downloading'}
                  Downloading v{latestVersion} in the background. You can keep working.
                {:else if updateState === 'ready'}
                  v{latestVersion} has been downloaded. Restart Moss to apply the update — your open notes will be preserved.
                {:else if updateState === 'error'}
                  <span class="sub-error">{errorMsg}</span>
                {/if}
              </div>
            </div>
          </div>

          <!-- State cards -->
          {#if updateState === 'up-to-date'}
            <div class="panel-card">
              <div class="changelog-heading">What's in {currentVersion}</div>
              <div class="changelog-empty">Your app is fully up to date.</div>
            </div>

          {:else if updateState === 'available'}
            <div class="available-card">
              <div class="available-top">
                <div>
                  <div class="whats-new-eyebrow">What's new</div>
                  <div class="release-name">Version {latestVersion}</div>
                </div>
                <button class="btn-primary" onclick={startDownload}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v8m0 0L3 6m3 3l3-3M2 11h8"
                      stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Download &amp; install
                </button>
              </div>
              {#if releaseNotes}
                <pre class="release-notes">{releaseNotes}</pre>
              {:else}
                <p class="release-notes-empty">No release notes for this version.</p>
              {/if}
              <div class="available-footer">
                <span class="release-notes-hint">Full changelog included above</span>
              </div>
            </div>

          {:else if updateState === 'downloading'}
            <div class="panel-card">
              <div class="download-header">
                <span class="download-label">Downloading {latestVersion}</span>
                <span class="download-bytes">
                  {#if totalMB > 0}
                    {downloadedMB.toFixed(1)} / {totalMB.toFixed(1)} MB&nbsp;·&nbsp;{downloadPct}%
                  {:else}
                    {downloadPct}%
                  {/if}
                </span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style:width="{downloadPct}%"></div>
              </div>
              <span class="download-eta">Downloading…</span>
            </div>

          {:else if updateState === 'ready'}
            <div class="ready-card">
              <div class="ready-left">
                <div class="ready-icon-wrap">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 9a6 6 0 1 1 1.8 4.2M3 14v-3.5h3.5"
                      stroke="var(--color-moss)" stroke-width="1.6"
                      stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div class="ready-title">Restart to apply {latestVersion}</div>
                  <div class="ready-sub">Takes about 3 seconds · all unsaved work is auto-saved first</div>
                </div>
              </div>
              <div class="ready-actions">
                <button class="btn-ghost" onclick={closeModal}>Later</button>
                <button class="btn-primary" onclick={restartNow}>Restart now</button>
              </div>
            </div>

          {:else if updateState === 'error'}
            <div class="error-card">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.4"/>
                <path d="M8 5v3.5M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>{errorMsg || 'Something went wrong. Please try again.'}</span>
            </div>
          {/if}

          <!-- Footer -->
          <div class="footer-divider"></div>
          <div class="footer-row">
            <div class="footer-left">
              <div class="auto-row">
                <span class="auto-label">Automatic updates</span>
                <button
                  class="toggle"
                  class:on={autoUpdate}
                  onclick={() => (autoUpdate = !autoUpdate)}
                  aria-pressed={autoUpdate}
                  aria-label="Toggle automatic updates"
                >
                  <span class="toggle-knob"></span>
                </button>
              </div>
              <div class="footer-meta">
                Channel:&nbsp;<span class="meta-em">Stable</span>
                &nbsp;·&nbsp;
                Last checked:&nbsp;<span class="meta-em">{lastChecked}</span>
              </div>
            </div>
            <button class="btn-ghost" onclick={checkForUpdates} disabled={updateState === 'downloading'}>
              Check for updates
            </button>
          </div>

        <!-- ════════════════ ABOUT PANEL ════════════════ -->
        {:else if activeNav === 'about'}

          <div class="about-hero">
            <div class="about-mark"><span>M</span></div>
            <div class="about-name">Moss</div>
            <div class="about-version">Version {currentVersion}</div>
            <div class="about-tagline">A warm, fast, cross-platform note-taking app.</div>
          </div>

          <div class="about-divider"></div>

          <div class="about-footer">
            <span>© {new Date().getFullYear()} Moss · MIT License</span>
            <span class="about-footer-sep">·</span>
            <span>Made with care for writers, learners, and thinkers.</span>
          </div>

        {/if}

      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Overlay ──────────────────────────────────────────────────────────── */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(2px);
  }

  .dialog {
    position: fixed;
    inset: 0;
    z-index: 201;
    margin: auto;
    width: 720px;
    height: 500px;
    display: flex;
    background: var(--color-bg);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.08),
      0 20px 60px rgba(0, 0, 0, 0.22);
    overflow: hidden;
    font-family: var(--font-mono);
  }

  /* ── Settings nav ─────────────────────────────────────────────────────── */
  .settings-nav {
    width: 160px;
    flex-shrink: 0;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    padding: 18px 8px;
    display: flex;
    flex-direction: column;
  }

  .nav-logo {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 10px 16px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 8px;
  }

  .nav-logo-mark {
    width: 18px;
    height: 18px;
    background: var(--color-moss);
    border-radius: 4px;
    display: grid;
    place-items: center;
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }

  .nav-logo-text {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: -0.01em;
  }

  .nav-btn {
    width: 100%;
    text-align: left;
    padding: 7px 11px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    font-size: 12px;
    font-family: var(--font-mono);
    cursor: pointer;
    margin-bottom: 1px;
    transition: background 0.1s, color 0.1s;
  }

  .nav-btn:hover:not(.active) {
    background: rgba(0, 0, 0, 0.04);
    color: var(--color-text);
  }

  .nav-btn.active {
    background: var(--color-moss);
    color: #fff;
    font-weight: 500;
  }

  .nav-spacer { flex: 1; }

  .nav-version {
    padding: 10px 11px 0;
    font-size: 10px;
    color: var(--color-text-muted);
    border-top: 1px solid var(--color-border);
  }

  /* ── Content ──────────────────────────────────────────────────────────── */
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .content-header {
    padding: 18px 28px 14px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .content-eyebrow {
    font-size: 10.5px;
    color: var(--color-text-muted);
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 3px;
  }

  .content-title {
    font-size: 19px;
    font-weight: 600;
    color: var(--color-text);
    font-family: var(--font-body);
    letter-spacing: -0.01em;
    margin: 0;
  }

  .content-body {
    flex: 1;
    overflow-y: auto;
    padding: 22px 28px;
    display: flex;
    flex-direction: column;
  }

  /* ── Version hero ─────────────────────────────────────────────────────── */
  .version-block {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
  }

  .moss-mark {
    width: 48px;
    height: 48px;
    background: var(--color-moss);
    border-radius: 11px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .moss-mark span {
    color: #fff;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.04em;
    font-family: var(--font-body);
  }

  .version-info { flex: 1; min-width: 0; }

  .version-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }

  .app-name {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text);
    font-family: var(--font-body);
    letter-spacing: -0.015em;
  }

  .version-num {
    font-size: 13px;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .version-sub {
    font-size: 12px;
    color: var(--color-text-muted);
    line-height: 1.55;
  }

  .version-sub strong { color: var(--color-text); }
  .sub-muted  { color: var(--color-text-muted); }
  .sub-error  { color: #a84848; }

  /* ── Status pills ─────────────────────────────────────────────────────── */
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 10.5px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 99px;
  }

  .pill-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .pill--success { background: var(--color-moss-tint); color: var(--color-moss-dark); }
  .pill--success .pill-dot { background: var(--color-moss); }

  .pill--amber { background: rgba(196, 144, 90, 0.14); color: #7a5a35; }
  .pill--amber .pill-dot { background: var(--color-amber); }

  .pill--info { background: rgba(91, 143, 168, 0.13); color: #3b5c6e; }
  .pill--info .pill-dot { background: #5b8fa8; }

  .pill--neutral { background: rgba(0,0,0,0.05); color: var(--color-text-muted); }
  .pill--neutral .pill-dot { background: var(--color-text-faint); }

  .pill--error { background: rgba(168,72,72,0.10); color: #a84848; }
  .pill--error .pill-dot { background: #a84848; }

  /* ── Panel card ───────────────────────────────────────────────────────── */
  .panel-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 9px;
    padding: 14px 16px;
  }

  /* ── Up to date ───────────────────────────────────────────────────────── */
  .changelog-heading {
    font-size: 10.5px;
    color: var(--color-text-muted);
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 7px;
  }

  .changelog-empty {
    font-size: 12px;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  /* ── Update available ─────────────────────────────────────────────────── */
  .available-card {
    background: linear-gradient(180deg, rgba(196,144,90,0.09), rgba(196,144,90,0.02));
    border: 1px solid rgba(196,144,90,0.30);
    border-radius: 10px;
    padding: 16px 16px 14px;
  }

  .available-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .whats-new-eyebrow {
    font-size: 10.5px;
    color: #7a5a35;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 3px;
  }

  .release-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text);
    font-family: var(--font-body);
    letter-spacing: -0.01em;
  }

  .release-notes {
    font-size: 11.5px;
    color: var(--color-text-muted);
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: var(--font-mono);
    margin: 0 0 10px;
    max-height: 90px;
    overflow-y: auto;
  }

  .release-notes-empty {
    font-size: 12px;
    color: var(--color-text-muted);
    margin: 0 0 10px;
  }

  .available-footer {
    padding-top: 10px;
    border-top: 1px dashed rgba(196,144,90,0.32);
  }

  .release-notes-hint {
    font-size: 11px;
    color: var(--color-text-muted);
    font-style: italic;
  }

  /* ── Downloading ──────────────────────────────────────────────────────── */
  .download-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
  }

  .download-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
  }

  .download-bytes {
    font-size: 11.5px;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .progress-track {
    height: 6px;
    background: rgba(0,0,0,0.06);
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 8px;
    position: relative;
  }

  .progress-fill {
    position: absolute;
    inset: 0;
    right: auto;
    background: linear-gradient(90deg, var(--color-moss), var(--color-moss-dark));
    border-radius: 99px;
    transition: width 0.3s ease;
  }

  .download-eta {
    font-size: 11px;
    color: var(--color-text-muted);
  }

  /* ── Error card ───────────────────────────────────────────────────────── */
  .error-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(168,72,72,0.06);
    border: 1px solid rgba(168,72,72,0.20);
    border-radius: 9px;
    padding: 14px 16px;
    font-size: 12px;
    color: #a84848;
    line-height: 1.55;
  }

  .error-card svg { flex-shrink: 0; margin-top: 1px; }

  /* ── Ready to restart ─────────────────────────────────────────────────── */
  .ready-card {
    background: var(--color-moss-tint);
    border: 1px solid rgba(90,127,84,0.22);
    border-radius: 10px;
    padding: 16px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .ready-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ready-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #fff;
    border: 1px solid rgba(90,127,84,0.18);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .ready-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 2px;
  }

  .ready-sub {
    font-size: 11px;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .ready-actions {
    display: flex;
    gap: 7px;
    flex-shrink: 0;
  }

  /* ── Buttons ──────────────────────────────────────────────────────────── */
  .btn-primary {
    background: var(--color-moss);
    color: #fff;
    border: none;
    border-radius: 7px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 500;
    font-family: var(--font-mono);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    transition: opacity 0.1s, transform 0.05s;
    flex-shrink: 0;
  }

  .btn-primary:hover           { opacity: 0.88; }
  .btn-primary:active          { transform: translateY(1px); }
  .btn-primary:disabled        { opacity: 0.45; cursor: default; }

  .btn-ghost {
    background: transparent;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    border-radius: 7px;
    padding: 7px 13px;
    font-size: 12px;
    font-weight: 500;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .btn-ghost:hover    { background: rgba(0,0,0,0.04); color: var(--color-text); }
  .btn-ghost:disabled { opacity: 0.45; cursor: default; }

  /* ── Footer ───────────────────────────────────────────────────────────── */
  .footer-divider {
    height: 1px;
    background: var(--color-border);
    margin: 20px 0 16px;
    flex-shrink: 0;
  }

  .footer-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 16px;
    align-items: start;
    flex-shrink: 0;
  }

  .auto-row {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 8px;
  }

  .auto-label {
    font-size: 12px;
    color: var(--color-text);
    font-weight: 500;
  }

  .footer-meta {
    font-size: 10.5px;
    color: var(--color-text-muted);
    line-height: 1.6;
  }

  .meta-em { color: var(--color-text-muted); }

  /* ── Toggle ───────────────────────────────────────────────────────────── */
  .toggle {
    width: 28px;
    height: 16px;
    border-radius: 99px;
    background: rgba(0,0,0,0.15);
    border: none;
    position: relative;
    cursor: pointer;
    padding: 0;
    transition: background 0.15s;
    flex-shrink: 0;
  }

  .toggle.on { background: var(--color-moss); }

  .toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    transition: left 0.15s;
  }

  .toggle.on .toggle-knob { left: 14px; }

  /* ── About panel ──────────────────────────────────────────────────────── */
  .about-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 10px 0 20px;
  }

  .about-mark {
    width: 64px;
    height: 64px;
    background: var(--color-moss);
    border-radius: 16px;
    display: grid;
    place-items: center;
    margin-bottom: 14px;
    box-shadow: 0 2px 8px rgba(90,127,84,0.25);
  }

  .about-mark span {
    color: #fff;
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.04em;
    font-family: var(--font-body);
  }

  .about-name {
    font-size: 26px;
    font-weight: 600;
    color: var(--color-text);
    font-family: var(--font-body);
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }

  .about-version {
    font-size: 12px;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    margin-bottom: 10px;
  }

  .about-tagline {
    font-size: 12.5px;
    color: var(--color-text-muted);
    font-family: var(--font-body);
    font-style: italic;
    line-height: 1.5;
    max-width: 300px;
  }

  .about-divider {
    height: 1px;
    background: var(--color-border);
    margin: 18px 0;
    flex-shrink: 0;
  }

  .about-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--color-text-muted);
    justify-content: center;
    flex-wrap: wrap;
  }

  .about-footer-sep { color: var(--color-text-muted); }

</style>
