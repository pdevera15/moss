<script lang="ts">
  import type { Task } from '$lib/stores/tasks.svelte'
  import { todayStart } from '$lib/utils/date'
  import DatePicker from './DatePicker.svelte'

  interface Props {
    task:        Task
    rolled?:     boolean
    openSubtask?: boolean
    ontoggle:    (id: string) => void
    ontogglesub: (taskId: string, subId: string) => void
    onaddsub:    (taskId: string, title: string) => void
    ondelete:    (id: string) => void
    onupdatedue: (taskId: string, dueDate: number | null) => void
  }

  let { task, rolled = false, openSubtask = false,
        ontoggle, ontogglesub, onaddsub, ondelete, onupdatedue }: Props = $props()

  let showDuePicker = $state(false)
  let chipEl        = $state<HTMLButtonElement | null>(null)

  let dueDateClass = $derived(
    !task.dueDate               ? '' :
    task.dueDate < todayStart() ? 'overdue' :
    task.dueDate === todayStart() ? 'due-today' : 'future'
  )

  let dueDateLabel = $derived(
    task.dueDate !== null
      ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : ''
  )

  // ── Swipe-to-delete (done tasks only) ───────────────────────────────
  const DELETE_THRESHOLD = 80   // px to trigger delete
  let swipeX     = $state(0)
  let swiping    = $state(false)
  let startX     = 0

  function onPointerDown(e: PointerEvent) {
    if (!task.done) return
    startX = e.clientX
    swiping = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!swiping) return
    const dx = e.clientX - startX
    swipeX = Math.min(0, dx)   // only allow leftward drag
  }

  function onPointerUp() {
    if (!swiping) return
    swiping = false
    if (swipeX <= -DELETE_THRESHOLD) {
      ondelete(task.id)
    } else {
      swipeX = 0
    }
  }

  let expanded        = $state(true)
  let addingSubtask = $state(false)

  $effect(() => {
    if (openSubtask) addingSubtask = true
  })
  let newSubtaskTitle = $state('')
  let subInputEl      = $state<HTMLInputElement | null>(null)

  $effect(() => {
    if (addingSubtask && subInputEl) subInputEl.focus()
  })

  let hasSubs  = $derived(task.subtasks.length > 0)
  let doneSubs = $derived(task.subtasks.filter(s => s.done).length)
  let allSubsDone = $derived(hasSubs && doneSubs === task.subtasks.length)

  function commitSubtask() {
    if (newSubtaskTitle.trim()) {
      onaddsub(task.id, newSubtaskTitle.trim())
      newSubtaskTitle = ''
    }
  }

  function handleSubKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      commitSubtask()        // add subtask, keep input open for next one
    } else if (e.key === 'Escape') {
      newSubtaskTitle = ''
      addingSubtask = false
    }
  }

  function handleSubBlur() {
    commitSubtask()          // save whatever's typed when focus leaves
    addingSubtask = false
  }
</script>

<div class="swipe-container" class:is-done={task.done}>
  <!-- Delete zone revealed on drag-left -->
  <div class="delete-zone" style:opacity={Math.min(1, -swipeX / DELETE_THRESHOLD)}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  </div>

<div
  class="task-row"
  class:done={task.done}
  class:rolled
  role="listitem"
  style:transform="translateX({swipeX}px)"
  style:transition={swiping ? 'none' : 'transform 0.2s ease'}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
>
  <!-- Circle checkbox -->
  <button
    class="circle"
    class:checked={task.done}
    onclick={() => ontoggle(task.id)}
    aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
  >
    {#if task.done}
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    {/if}
  </button>

  <div class="task-content">
    <!-- Title row -->
    <div class="title-row" class:has-subs={hasSubs && expanded}>
      <span class="task-title" class:done={task.done}>{task.title}</span>

      {#if task.dueDate !== null}
        <span class="due-chip-wrap">
          <button
            bind:this={chipEl}
            class="due-chip {dueDateClass}"
            onclick={() => showDuePicker = true}
            aria-label="Edit due date"
          >{dueDateLabel}</button>
          <button
            class="due-clear"
            onclick={(e) => { e.stopPropagation(); onupdatedue(task.id, null) }}
            aria-label="Clear due date"
          >×</button>
        </span>
      {/if}

      {#if rolled && !task.done}
        <span class="yesterday-badge">yesterday</span>
      {/if}

      {#if hasSubs}
        <div class="progress-pill">
          <div class="progress-track">
            <div
              class="progress-fill"
              class:complete={allSubsDone}
              style:width="{(doneSubs / task.subtasks.length) * 100}%"
            ></div>
          </div>
          <span class="progress-count" class:complete={allSubsDone}>{doneSubs}/{task.subtasks.length}</span>
        </div>

        <button
          class="chevron"
          class:collapsed={!expanded}
          onclick={() => expanded = !expanded}
          aria-label="Toggle subtasks"
        >▾</button>
      {/if}
    </div>

    <!-- Subtasks -->
    {#if hasSubs && expanded}
      <div class="subtasks">
        {#each task.subtasks as sub (sub.id)}
          <div class="subtask-row">
            <button
              class="circle small"
              class:checked={sub.done}
              onclick={() => ontogglesub(task.id, sub.id)}
              aria-label={sub.done ? 'Mark incomplete' : 'Mark complete'}
            >
              {#if sub.done}
                <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              {/if}
            </button>
            <span class="subtask-title" class:done={sub.done}>{sub.title}</span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Add subtask -->
    {#if !task.done}
      {#if addingSubtask}
        <div class="add-sub-row">
          <div class="circle-dashed"></div>
          <input
            bind:this={subInputEl}
            class="sub-input"
            bind:value={newSubtaskTitle}
            placeholder="Subtask…"
            onkeydown={handleSubKeydown}
            onblur={handleSubBlur}
          />
        </div>
      {:else}
        <button class="add-sub-btn" onclick={() => addingSubtask = true}>+ subtask</button>
      {/if}
    {/if}
  </div>
</div>

{#if showDuePicker && chipEl}
  <DatePicker
    value={task.dueDate}
    anchorEl={chipEl}
    onselect={(d) => { onupdatedue(task.id, d); showDuePicker = false }}
    onclose={() => showDuePicker = false}
  />
{/if}
</div>

<style>
  /* ── Swipe container ── */
  .swipe-container {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    margin-bottom: 6px;
  }

  .delete-zone {
    position: absolute;
    inset: 0;
    background: var(--color-error, #A84848);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 18px;
    border-radius: 8px;
    pointer-events: none;
  }

  .task-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid transparent;
    margin-bottom: 0;
    transition: background 0.15s;
    position: relative;
    background: var(--color-bg);
    touch-action: pan-y;
    user-select: none;
  }

  .task-row.done    { background: var(--color-bg); }
  .task-row.rolled  { background: rgba(196,168,74,0.04); border-color: rgba(196,168,74,0.18); }

  /* ── Circles ── */
  .circle {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.75px solid rgba(0,0,0,0.2);
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    padding: 0;
    margin-top: 2px;
  }

  .circle.checked {
    background: var(--color-moss);
    border-color: var(--color-moss);
    box-shadow: 0 0 0 3px rgba(59,104,64,0.12);
  }

  .circle.small { width: 14px; height: 14px; margin-top: 0; }

  .circle-dashed {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1.5px dashed rgba(0,0,0,0.18);
    flex-shrink: 0;
  }

  /* ── Content ── */
  .task-content {
    flex: 1;
    min-width: 0;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .title-row.has-subs { margin-bottom: 6px; }

  .task-title {
    font-size: 13.5px;
    font-weight: 500;
    color: var(--color-text);
    flex: 1;
    transition: all 0.15s;
    line-height: 1.4;
  }

  .task-title.done {
    text-decoration: line-through;
    color: var(--color-text-muted);
  }

  /* ── Yesterday badge ── */
  .yesterday-badge {
    font-size: 9.5px;
    font-weight: 500;
    color: #a08040;
    background: rgba(196,168,74,0.15);
    padding: 1px 6px;
    border-radius: 10px;
    flex-shrink: 0;
    font-family: var(--font-mono);
  }

  /* ── Progress pill ── */
  .progress-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
  }

  .progress-track {
    width: 44px;
    height: 4px;
    border-radius: 3px;
    background: rgba(0,0,0,0.09);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #c4a84a;
    border-radius: 3px;
    transition: width 0.2s;
  }

  .progress-fill.complete { background: var(--color-moss); }

  .progress-count {
    font-size: 10.5px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .progress-count.complete { color: var(--color-moss); font-weight: 600; }

  /* ── Chevron ── */
  .chevron {
    font-size: 9px;
    color: var(--color-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: inline-block;
    transition: transform 0.15s;
    line-height: 1;
    margin-left: 2px;
  }

  .chevron.collapsed { transform: rotate(-90deg); }

  /* ── Subtasks ── */
  .subtasks {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 4px;
    padding-left: 2px;
  }

  .subtask-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .subtask-title {
    font-size: 12px;
    color: var(--color-text-muted);
    transition: all 0.15s;
  }

  .subtask-title.done { text-decoration: line-through; opacity: 0.6; }

  /* ── Add subtask ── */
  .add-sub-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 2px;
    margin-top: 4px;
  }

  .sub-input {
    font-size: 12px;
    color: var(--color-text);
    background: none;
    border: none;
    outline: none;
    flex: 1;
    font-family: inherit;
  }

  .add-sub-btn {
    font-size: 11px;
    color: var(--color-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding-left: 2px;
    margin-top: 2px;
    display: inline-block;
    transition: color 0.1s;
    font-family: var(--font-mono);
  }

  .add-sub-btn:hover { color: var(--color-text); }

  /* ── Due date chip ── */
  .due-chip-wrap {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .due-chip {
    font-size: 10px;
    font-family: var(--font-mono, monospace);
    padding: 2px 6px;
    border-radius: var(--r-full, 9999px);
    border: 1px solid currentColor;
    background: none;
    cursor: pointer;
    line-height: 1.4;
    transition: opacity 0.1s;
  }
  .due-chip:hover { opacity: 0.7; }

  .due-chip.overdue   { color: var(--amber-500, #C4905A); }
  .due-chip.due-today { color: var(--moss-500,  #5A7F54); }
  .due-chip.future    { color: var(--text-2,    #6A6760); }

  .due-clear {
    font-size: 11px;
    line-height: 1;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-3, #9A9790);
    padding: 0 2px;
    opacity: 0.7;
    transition: opacity 0.1s;
  }
  .due-clear:hover { opacity: 1; color: var(--text-1, #3A3830); }
</style>
