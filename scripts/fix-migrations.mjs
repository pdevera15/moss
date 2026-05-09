#!/usr/bin/env node
import { DatabaseSync } from 'node:sqlite'
import { createHash } from 'node:crypto'
import { readFileSync, copyFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')

const migrations = [
  { version: 1, description: 'initial_schema', file: 'src-tauri/migrations/0000_curly_patriot.sql' },
  { version: 2, description: 'add_tasks',      file: 'src-tauri/migrations/0001_solid_maelstrom.sql' },
  { version: 3, description: 'add_fts5',       file: 'src-tauri/migrations/0002_add_fts5.sql' },
  { version: 4, description: 'add_due_date',   file: 'src-tauri/migrations/0003_fair_paladin.sql' },
  { version: 5, description: 'add_embeddings', file: 'src-tauri/migrations/0004_add_embeddings.sql' },
  { version: 6, description: 'add_settings',   file: 'src-tauri/migrations/0005_add_settings.sql' },
  { version: 7, description: 'add_language',   file: 'src-tauri/migrations/0006_add_language.sql' },
]

const dbPath = process.argv[2] ?? join(homedir(), 'AppData', 'Roaming', 'app.getmoss.desktop', 'moss.db')

if (!existsSync(dbPath)) {
  console.error(`moss.db not found at: ${dbPath}`)
  console.error('Pass the path as an argument: node scripts/fix-migrations.mjs <path-to-moss.db>')
  process.exit(1)
}

const backupPath = `${dbPath}.bak-${Date.now()}`
copyFileSync(dbPath, backupPath)
console.log(`Backup created: ${backupPath}`)

const db = new DatabaseSync(dbPath)

const tableExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_sqlx_migrations'")
  .get()

if (!tableExists) {
  console.error('_sqlx_migrations table not found — this DB was not created by tauri-plugin-sql.')
  process.exit(1)
}

const update = db.prepare('UPDATE _sqlx_migrations SET checksum = ?, success = 1 WHERE version = ?')
const select = db.prepare('SELECT version, description, hex(checksum) AS checksum FROM _sqlx_migrations WHERE version = ?')

let touched = 0
for (const m of migrations) {
  const sql = readFileSync(resolve(repoRoot, m.file))
  const newChecksum = createHash('sha384').update(sql).digest()
  const before = select.get(m.version)
  if (!before) {
    console.log(`v${m.version} (${m.description}): no row — skipping`)
    continue
  }
  const newHex = newChecksum.toString('hex').toUpperCase()
  if (before.checksum.toUpperCase() === newHex) {
    console.log(`v${m.version} (${m.description}): already correct`)
    continue
  }
  update.run(newChecksum, m.version)
  console.log(`v${m.version} (${m.description}): ${before.checksum.slice(0, 16)}... -> ${newHex.slice(0, 16)}...`)
  touched++
}

db.close()
console.log(`\nDone. Updated ${touched} migration row(s). Restart Moss.`)
