import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

export const notes = sqliteTable('notes', {
  id:         text('id').primaryKey(),
  title:      text('title').notNull().default(''),
  body:       text('body').notNull().default(''),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
})

export const tags = sqliteTable('tags', {
  id:   text('id').primaryKey(),
  name: text('name').unique().notNull(),
})

export const noteTags = sqliteTable('note_tags', {
  note_id: text('note_id').notNull().references(() => notes.id),
  tag_id:  text('tag_id').notNull().references(() => tags.id),
}, (t) => [
  primaryKey({ columns: [t.note_id, t.tag_id] }),
])
