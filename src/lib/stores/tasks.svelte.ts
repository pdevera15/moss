import { getDb } from '$lib/db'
import { tasks } from '$lib/db/schema'
import { eq, asc, isNull, not } from 'drizzle-orm'
import { todayStart } from '$lib/utils/date'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  done: boolean
  rolled: boolean
  subtasks: Subtask[]
}

class TasksStore {
  tasks           = $state<Task[]>([])
  bannerDismissed = $state(false)
  isLoading       = $state(false)

  get rolledTasks(): Task[] {
    return this.tasks.filter(t => t.rolled)
  }

  get todayTasks(): Task[] {
    return this.tasks.filter(t => !t.rolled)
  }

  get doneToday(): number {
    return this.todayTasks.filter(t => t.done).length
  }

  get totalToday(): number {
    return this.todayTasks.length
  }

  get allDone(): boolean {
    return this.totalToday > 0 && this.doneToday === this.totalToday
  }

  async load(): Promise<void> {
    this.isLoading = true
    try {
      const db  = await getDb()
      const today = todayStart()

      // All parent tasks for today (and any rolled from previous days)
      const rows = await db
        .select()
        .from(tasks)
        .where(isNull(tasks.parent_id))
        .orderBy(asc(tasks.position), asc(tasks.created_at))

      // Subtasks
      const subRows = await db
        .select()
        .from(tasks)
        .where(not(isNull(tasks.parent_id)))
        .orderBy(asc(tasks.position), asc(tasks.created_at))

      const subsByParent = new Map<string, Subtask[]>()
      for (const s of subRows) {
        const pid = s.parent_id!
        if (!subsByParent.has(pid)) subsByParent.set(pid, [])
        subsByParent.get(pid)!.push({ id: s.id, title: s.title, done: Boolean(s.done) })
      }

      this.tasks = rows.map(r => ({
        id:       r.id,
        title:    r.title,
        done:     Boolean(r.done),
        rolled:   Boolean(r.rolled),
        subtasks: subsByParent.get(r.id) ?? [],
      }))
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      this.isLoading = false
    }
  }

  async addTask(title: string): Promise<string> {
    const id  = crypto.randomUUID()
    const now = Date.now()
    const pos = this.tasks.filter(t => !t.rolled).length
    try {
      const db = await getDb()
      await db.insert(tasks).values({
        id, title, done: false, rolled: false,
        scheduled_date: todayStart(), parent_id: null,
        position: pos, created_at: now, updated_at: now,
      })
      this.tasks.push({ id, title, done: false, rolled: false, subtasks: [] })
    } catch (err) {
      console.error('Failed to add task:', err)
    }
    return id
  }

  async toggleTask(id: string): Promise<void> {
    const task = this.tasks.find(t => t.id === id)
    if (!task) return
    task.done = !task.done
    try {
      const db = await getDb()
      await db.update(tasks).set({ done: task.done, updated_at: Date.now() }).where(eq(tasks.id, id))
    } catch (err) {
      console.error('Failed to toggle task:', err)
    }
  }

  async toggleSubtask(taskId: string, subId: string): Promise<void> {
    const task = this.tasks.find(t => t.id === taskId)
    if (!task) return
    const sub = task.subtasks.find(s => s.id === subId)
    if (!sub) return
    sub.done = !sub.done
    if (task.subtasks.length > 0) task.done = task.subtasks.every(s => s.done)
    try {
      const db  = await getDb()
      const now = Date.now()
      await db.update(tasks).set({ done: sub.done, updated_at: now }).where(eq(tasks.id, subId))
      await db.update(tasks).set({ done: task.done, updated_at: now }).where(eq(tasks.id, taskId))
    } catch (err) {
      console.error('Failed to toggle subtask:', err)
    }
  }

  async addSubtask(taskId: string, title: string): Promise<void> {
    const task = this.tasks.find(t => t.id === taskId)
    if (!task) return
    const id  = crypto.randomUUID()
    const now = Date.now()
    const pos = task.subtasks.length
    try {
      const db = await getDb()
      await db.insert(tasks).values({
        id, title, done: false, rolled: false,
        scheduled_date: todayStart(), parent_id: taskId,
        position: pos, created_at: now, updated_at: now,
      })
      task.subtasks.push({ id, title, done: false })
    } catch (err) {
      console.error('Failed to add subtask:', err)
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const db = await getDb()
      // delete subtasks first, then parent
      await db.delete(tasks).where(eq(tasks.parent_id, id))
      await db.delete(tasks).where(eq(tasks.id, id))
      this.tasks = this.tasks.filter(t => t.id !== id)
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  dismissBanner(): void {
    this.bannerDismissed = true
  }
}

export const tasksStore = new TasksStore()
