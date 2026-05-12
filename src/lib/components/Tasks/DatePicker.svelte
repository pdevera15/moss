<script lang="ts">
  import { onMount, untrack } from "svelte";

  interface Props {
    value: number | null;
    anchorEl: HTMLElement;
    onselect: (date: number) => void; // emits midnight Unix ms of selected day
    onclose: () => void;
  }

  let { value, anchorEl, onselect, onclose }: Props = $props();

  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const _init = untrack(() => (value ? new Date(value) : new Date()));
  let viewYear = $state(_init.getFullYear());
  let viewMonth = $state(_init.getMonth());
  let popoverEl = $state<HTMLElement | null>(null);
  let posStyle = $state("");

  onMount(() => {
    const rect = anchorEl.getBoundingClientRect();
    const POP_W = 224;
    const popH = 274;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= popH ? rect.bottom + 6 : rect.top - popH - 6;
    const left = Math.min(rect.left, window.innerWidth - POP_W - 8);
    posStyle = `top:${top}px;left:${left}px;`;
    popoverEl?.focus();
  });

  let days = $derived(buildDays(viewYear, viewMonth));

  function buildDays(year: number, month: number) {
    const first = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startDow = first.getDay();
    const cells: { date: Date; current: boolean }[] = [];

    // Pad with trailing days from previous month
    for (let i = startDow - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month, -i), current: false });
    }
    // Current month
    for (let d = 1; d <= lastDay; d++) {
      cells.push({ date: new Date(year, month, d), current: true });
    }
    // Pad to fill 6 rows (42 cells)
    while (cells.length < 42) {
      const next = cells.length - startDow - lastDay + 1;
      cells.push({ date: new Date(year, month + 1, next), current: false });
    }
    return cells;
  }

  function isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function isToday(d: Date): boolean {
    return isSameDay(d, new Date());
  }
  function isSelected(d: Date): boolean {
    return value ? isSameDay(d, new Date(value)) : false;
  }

  function prevMonth() {
    if (viewMonth === 0) {
      viewMonth = 11;
      viewYear--;
    } else viewMonth--;
  }
  function nextMonth() {
    if (viewMonth === 11) {
      viewMonth = 0;
      viewYear++;
    } else viewMonth++;
  }

  function selectDay(d: Date) {
    const midnight = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
    ).getTime();
    onselect(midnight);
    onclose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onclose();
      return;
    }

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const all = Array.from(
        popoverEl?.querySelectorAll(".dp-day") ?? [],
      ) as HTMLButtonElement[];
      const idx = all.indexOf(document.activeElement as HTMLButtonElement);
      if (idx === -1) {
        // Nothing focused yet — jump to selected day, today, or first cell
        const selected = all.find((b) => b.classList.contains("selected"));
        const today = all.find((b) => b.classList.contains("today"));
        const firstCurrent = all.find((b) => !b.classList.contains("other"));
        (selected ?? today ?? firstCurrent ?? all[0])?.focus();
        return;
      }
      let next = idx;
      if (e.key === "ArrowRight") next = idx + 1;
      else if (e.key === "ArrowLeft") next = idx - 1;
      else if (e.key === "ArrowDown") next = idx + 7;
      else next = idx - 7;
      // Skip .other (adjacent-month) cells — step further in same direction
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      while (
        next >= 0 &&
        next < all.length &&
        all[next].classList.contains("other")
      )
        next += step;
      if (next >= 0 && next < all.length) all[next].focus();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const focused = document.activeElement as HTMLButtonElement | null;
      if (focused?.classList.contains("dp-day")) focused.click();
    }
  }

  function handleClickOutside(e: MouseEvent) {
    const t = e.target as Node;
    if (popoverEl && !popoverEl.contains(t) && !anchorEl.contains(t)) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onclick={handleClickOutside} />

<div
  bind:this={popoverEl}
  class="dp"
  style={posStyle}
  role="dialog"
  aria-label="Choose due date"
  tabindex="-1"
>
  <div class="dp-head">
    <button class="dp-nav" onclick={prevMonth} aria-label="Previous month"
      >‹</button
    >
    <span class="dp-month">{MONTHS[viewMonth]} {viewYear}</span>
    <button class="dp-nav" onclick={nextMonth} aria-label="Next month">›</button
    >
  </div>

  <div class="dp-grid">
    {#each DOW as label}
      <div class="dp-dow">{label}</div>
    {/each}
    {#each days as { date, current }}
      <button
        class="dp-day"
        class:other={!current}
        class:today={isToday(date)}
        class:selected={isSelected(date)}
        onclick={() => selectDay(date)}
        tabindex={current ? 0 : -1}
        aria-label={date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}>{date.getDate()}</button
      >
    {/each}
  </div>
</div>

<style>
  .dp {
    position: fixed;
    background: var(--color-bg, #fafaf8);
    border: 1px solid var(--color-border, #ddddd8);
    border-radius: var(--radius-lg, 12px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 12px;
    width: 224px;
    z-index: 1000;
    outline: none;
  }

  .dp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .dp-month {
    font-size: 12px;
    font-weight: 600;
    font-family: var(--font-mono, monospace);
    color: var(--color-text, #1e1c18);
  }

  .dp-nav {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    color: var(--color-text-muted, #6a6760);
    padding: 2px 6px;
    border-radius: var(--radius-sm, 4px);
    line-height: 1;
    transition:
      background 0.1s,
      color 0.1s;
  }
  .dp-nav:hover {
    background: var(--color-surface-2, #e8e8e5);
    color: var(--color-text, #1e1c18);
  }

  .dp-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .dp-dow {
    font-size: 10px;
    font-family: var(--font-mono, monospace);
    color: var(--color-text-muted, #9a9790);
    text-align: center;
    padding-bottom: 4px;
  }

  .dp-day {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm, 4px);
    border: none;
    background: none;
    cursor: pointer;
    font-size: 12px;
    font-family: var(--font-mono, monospace);
    color: var(--color-text, #1e1c18);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s;
    padding: 0;
  }
  .dp-day:hover:not(.selected):not(.other) {
    background: var(--color-surface-2, #e8e8e5);
  }

  .dp-day.other {
    color: var(--color-text-faint, #c0bdb6);
    cursor: default;
  }
  .dp-day.other:hover {
    background: none;
  }

  .dp-day.today {
    box-shadow: inset 0 0 0 1.5px var(--color-moss, #5a7f54);
    color: var(--color-moss, #5a7f54);
    font-weight: 600;
  }

  .dp-day.selected {
    background: var(--color-moss, #5a7f54);
    color: white;
    font-weight: 600;
    box-shadow: none;
  }
</style>
