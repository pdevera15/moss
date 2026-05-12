<script lang="ts">
  import { tasksStore } from "$lib/stores/tasks.svelte";
  import TaskItem from "./TaskItem.svelte";
  import DatePicker from "./DatePicker.svelte";

  let addingTask = $state(false);
  let newTaskTitle = $state("");
  let taskInputEl = $state<HTMLInputElement | null>(null);
  let pendingSubtaskFor = $state<string | null>(null);
  let showDatePicker = $state(false);
  let pendingDueDate = $state<number | null>(null);
  let inputRowEl = $state<HTMLElement | null>(null);

  $effect(() => {
    if (addingTask && taskInputEl) taskInputEl.focus();
  });

  const todayLabel = (() => {
    const now = new Date();
    const day = now.toLocaleDateString("en-US", { weekday: "long" });
    const date = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${day} · ${date}`;
  })();

  let progressPct = $derived(
    tasksStore.totalToday > 0
      ? (tasksStore.doneToday / tasksStore.totalToday) * 100
      : 0,
  );

  function commitTask() {
    if (newTaskTitle.trim()) {
      tasksStore.addTask(newTaskTitle.trim(), pendingDueDate);
      newTaskTitle = "";
      pendingDueDate = null;
    }
  }

  function handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    // Guard prevents re-triggering when picker is already open (e.g. after Escape without clearing ">")
    if (!showDatePicker && (val === ">" || val.endsWith(" >"))) {
      showDatePicker = true;
    }
  }

  async function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      if (newTaskTitle.trim()) {
        const id = await tasksStore.addTask(
          newTaskTitle.trim(),
          pendingDueDate,
        );
        newTaskTitle = "";
        pendingDueDate = null;
        addingTask = false;
        pendingSubtaskFor = id;
      }
    } else if (e.key === "Enter") {
      commitTask();
    } else if (e.key === "Escape") {
      newTaskTitle = "";
      addingTask = false;
    }
  }

  function handleBlur() {
    if (showDatePicker) return; // picker is open — focus moved into it, don't commit yet
    commitTask();
    addingTask = false;
  }
</script>

<div class="tasks-panel">
  <!-- ── Header ── -->
  <div class="panel-header">
    <div class="header-left">
      <div class="date-label">{todayLabel}</div>
      <h1 class="panel-title">Today's Tasks</h1>
    </div>
    <div class="header-right">
      <div class="done-label" class:all-done={tasksStore.allDone}>
        {#if tasksStore.allDone}
          🎉 All done!
        {:else if tasksStore.totalToday > 0}
          {tasksStore.doneToday} of {tasksStore.totalToday} done
        {:else}
          No tasks yet
        {/if}
      </div>
      <div class="day-bar">
        <div
          class="day-fill"
          class:all-done={tasksStore.allDone}
          style:width="{progressPct}%"
        ></div>
      </div>
    </div>
  </div>
  <div class="header-rule"></div>

  <!-- ── Rollover banner ── -->
  {#if !tasksStore.bannerDismissed && tasksStore.rolledTasks.length > 0}
    <div class="rollover-banner">
      <span class="rollover-icon">↩</span>
      <div class="rollover-body">
        <span class="rollover-main">
          {tasksStore.rolledTasks.length} task{tasksStore.rolledTasks.length > 1
            ? "s"
            : ""} moved from yesterday
        </span>
        <span class="rollover-sub">They're at the top of your list.</span>
      </div>
      <button
        class="rollover-dismiss"
        onclick={() => tasksStore.dismissBanner()}>×</button
      >
    </div>
  {/if}

  <!-- ── Task list ── -->
  <div class="task-scroll">
    <!-- Rolled-over tasks -->
    {#if !tasksStore.bannerDismissed && tasksStore.rolledTasks.length > 0}
      <div class="rolled-section">
        {#each tasksStore.rolledTasks as task (task.id)}
          <TaskItem
            {task}
            rolled
            ontoggle={(id) => tasksStore.toggleTask(id)}
            ontogglesub={(tid, sid) => tasksStore.toggleSubtask(tid, sid)}
            onaddsub={(tid, title) => tasksStore.addSubtask(tid, title)}
            ondelete={(id) => tasksStore.deleteTask(id)}
            onupdatedue={(id, d) => tasksStore.updateDueDate(id, d)}
            ontitle={(id, t) => tasksStore.updateTitle(id, t)}
            onupdatesub={(tid, sid, t) =>
              tasksStore.updateSubtaskTitle(tid, sid, t)}
          />
        {/each}
      </div>
    {/if}

    <!-- "New today" divider -->
    {#if !tasksStore.bannerDismissed && tasksStore.rolledTasks.length > 0 && tasksStore.todayTasks.length > 0}
      <div class="section-divider">
        <div class="divider-line"></div>
        <span class="divider-label">New today</span>
        <div class="divider-line"></div>
      </div>
    {/if}

    <!-- Today's tasks -->
    {#each tasksStore.todayTasks as task (task.id)}
      <TaskItem
        {task}
        rolled={false}
        openSubtask={pendingSubtaskFor === task.id}
        ontoggle={(id) => tasksStore.toggleTask(id)}
        ontogglesub={(tid, sid) => tasksStore.toggleSubtask(tid, sid)}
        onaddsub={(tid, title) => {
          tasksStore.addSubtask(tid, title);
          pendingSubtaskFor = null;
        }}
        ondelete={(id) => tasksStore.deleteTask(id)}
        onupdatedue={(id, d) => tasksStore.updateDueDate(id, d)}
        ontitle={(id, t) => tasksStore.updateTitle(id, t)}
        onupdatesub={(tid, sid, t) =>
          tasksStore.updateSubtaskTitle(tid, sid, t)}
      />
    {/each}

    <!-- Add task -->
    {#if addingTask}
      <div class="add-task-input-row" bind:this={inputRowEl}>
        <div class="add-circle dashed"></div>
        <input
          bind:this={taskInputEl}
          class="add-task-input"
          bind:value={newTaskTitle}
          placeholder="New task…"
          oninput={handleInput}
          onkeydown={handleKeydown}
          onblur={handleBlur}
        />
        <span class="add-task-hint">
          {#if showDatePicker}pick a date · Esc to cancel{:else}↵ to add · Esc
            to close{/if}
        </span>
      </div>

      {#if showDatePicker && inputRowEl}
        <DatePicker
          value={pendingDueDate}
          anchorEl={inputRowEl}
          onselect={(d) => {
            pendingDueDate = d;
            newTaskTitle = newTaskTitle.replace(/ ?>$/, "").trimEnd();
            showDatePicker = false;
            taskInputEl?.focus();
          }}
          onclose={() => {
            showDatePicker = false;
            taskInputEl?.focus();
          }}
        />
      {/if}
    {:else}
      <button class="add-task-btn" onclick={() => (addingTask = true)}>
        <div class="add-circle">
          <span class="add-plus">+</span>
        </div>
        <span class="add-task-label">Add a task…</span>
      </button>
    {/if}
  </div>
</div>

<style>
  .tasks-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--color-bg);
  }

  /* ── Header ── */
  .panel-header {
    padding: 22px 28px 0;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-shrink: 0;
    margin-bottom: 16px;
  }

  .date-label {
    font-size: 11px;
    color: var(--color-text-muted);
    margin-bottom: 3px;
    font-family: var(--font-mono);
    letter-spacing: 0.02em;
  }

  .panel-title {
    font-size: 22px;
    font-weight: 600;
    font-family: var(--font-body);
    color: var(--color-text);
    line-height: 1.15;
  }

  .header-right {
    text-align: right;
    padding-bottom: 2px;
  }

  .done-label {
    font-size: 11px;
    color: var(--color-text-muted);
    margin-bottom: 4px;
    font-family: var(--font-mono);
  }
  .done-label.all-done {
    color: var(--color-moss);
    font-weight: 600;
  }

  .day-bar {
    width: 120px;
    height: 5px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.08);
    overflow: hidden;
    margin-left: auto;
  }

  .day-fill {
    height: 100%;
    background: #c4a84a;
    border-radius: 4px;
    transition: width 0.3s;
  }
  .day-fill.all-done {
    background: var(--color-moss);
  }

  .header-rule {
    height: 1px;
    background: rgba(0, 0, 0, 0.055);
    margin: 0 28px;
    flex-shrink: 0;
  }

  /* ── Rollover banner ── */
  .rollover-banner {
    margin: 14px 20px 0;
    padding: 10px 14px;
    border-radius: 8px;
    background: rgba(196, 168, 74, 0.1);
    border: 1px solid rgba(196, 168, 74, 0.25);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .rollover-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .rollover-body {
    flex: 1;
  }

  .rollover-main {
    font-size: 12px;
    font-weight: 500;
    color: #7a6020;
  }

  .rollover-sub {
    font-size: 11px;
    color: #a08040;
    margin-left: 6px;
  }

  .rollover-dismiss {
    font-size: 15px;
    color: #a08040;
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.6;
    line-height: 1;
    padding: 0 2px;
    transition: opacity 0.1s;
  }
  .rollover-dismiss:hover {
    opacity: 1;
  }

  /* ── Task scroll ── */
  .task-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 14px 20px 20px;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  .rolled-section {
    margin-bottom: 4px;
  }

  /* ── Section divider ── */
  .section-divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .divider-line {
    flex: 1;
    height: 1px;
    background: rgba(0, 0, 0, 0.055);
  }

  .divider-label {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  /* ── Add task button ── */
  .add-task-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    cursor: pointer;
    width: 100%;
    background: transparent;
    border: none;
    margin-top: 4px;
    transition: background 0.1s;
    font: inherit;
  }
  .add-task-btn:hover {
    background: rgba(0, 0, 0, 0.03);
  }

  .add-circle {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.75px dashed rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .add-circle.dashed {
    border-style: dashed;
    border-color: rgba(0, 0, 0, 0.2);
  }

  .add-plus {
    font-size: 12px;
    line-height: 1;
    color: var(--color-text-muted);
    margin-top: -1px;
  }

  .add-task-label {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  /* ── Add task input ── */
  .add-task-input-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px dashed rgba(59, 104, 64, 0.3);
    margin-top: 4px;
  }

  .add-task-input {
    font-size: 13.5px;
    color: var(--color-text);
    background: none;
    border: none;
    outline: none;
    flex: 1;
    font-family: inherit;
    font-weight: 500;
  }

  .add-task-hint {
    font-size: 10px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }
</style>
