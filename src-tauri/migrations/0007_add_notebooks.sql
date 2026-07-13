CREATE TABLE IF NOT EXISTS notebooks (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO notebooks (id, name, position, created_at, updated_at)
VALUES ('default', 'Notes', 0, strftime('%s','now') * 1000, strftime('%s','now') * 1000);
--> statement-breakpoint
ALTER TABLE notes ADD COLUMN notebook_id TEXT DEFAULT 'default';
--> statement-breakpoint
UPDATE notes SET notebook_id = 'default' WHERE notebook_id IS NULL;
