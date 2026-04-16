use rusqlite::{Connection, Result as SqlResult, params};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub body: String,
    pub created_at: i64,
    pub updated_at: i64,
}

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

pub fn run_migrations(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS notes (
            id          TEXT PRIMARY KEY,
            title       TEXT NOT NULL DEFAULT '',
            body        TEXT NOT NULL DEFAULT '',
            created_at  INTEGER NOT NULL,
            updated_at  INTEGER NOT NULL
        );"
    )
}

pub fn get_or_create_default_note_inner(conn: &Connection) -> SqlResult<Note> {
    let existing: SqlResult<Note> = conn.query_row(
        "SELECT id, title, body, created_at, updated_at FROM notes LIMIT 1",
        [],
        |row| Ok(Note {
            id:         row.get(0)?,
            title:      row.get(1)?,
            body:       row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        }),
    );

    match existing {
        Ok(note) => Ok(note),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            let note = Note {
                id:         Uuid::new_v4().to_string(),
                title:      String::new(),
                body:       String::new(),
                created_at: now_ms(),
                updated_at: now_ms(),
            };
            conn.execute(
                "INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![note.id, note.title, note.body, note.created_at, note.updated_at],
            )?;
            Ok(note)
        }
        Err(e) => Err(e),
    }
}

pub fn save_note_inner(conn: &Connection, id: &str, title: &str, body: &str) -> SqlResult<()> {
    conn.execute(
        "UPDATE notes SET title = ?1, body = ?2, updated_at = ?3 WHERE id = ?4",
        params![title, body, now_ms(), id],
    )?;
    Ok(())
}

// ── Tauri command wrappers ────────────────────────────────────────────────

use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn get_or_create_default_note(
    db: State<'_, Mutex<Connection>>,
) -> Result<Note, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    get_or_create_default_note_inner(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_note(
    db: State<'_, Mutex<Connection>>,
    id: String,
    title: String,
    body: String,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    save_note_inner(&conn, &id, &title, &body).map_err(|e| e.to_string())
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn test_creates_note_on_empty_db() {
        let conn = test_db();
        let note = get_or_create_default_note_inner(&conn).unwrap();
        assert!(!note.id.is_empty(), "id should be a uuid");
        assert_eq!(note.title, "");
        assert_eq!(note.body, "");
        assert!(note.created_at > 0);
    }

    #[test]
    fn test_returns_existing_note_on_second_call() {
        let conn = test_db();
        let first  = get_or_create_default_note_inner(&conn).unwrap();
        let second = get_or_create_default_note_inner(&conn).unwrap();
        assert_eq!(first.id, second.id, "should return same note, not create a new one");
    }

    #[test]
    fn test_only_one_row_after_multiple_loads() {
        let conn = test_db();
        get_or_create_default_note_inner(&conn).unwrap();
        get_or_create_default_note_inner(&conn).unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM notes", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_save_note_updates_title_and_body() {
        let conn = test_db();
        let note = get_or_create_default_note_inner(&conn).unwrap();
        save_note_inner(&conn, &note.id, "My Title", "Hello body").unwrap();
        let updated = get_or_create_default_note_inner(&conn).unwrap();
        assert_eq!(updated.title, "My Title");
        assert_eq!(updated.body, "Hello body");
    }

    #[test]
    fn test_save_note_updates_updated_at() {
        let conn = test_db();
        let note = get_or_create_default_note_inner(&conn).unwrap();
        let original_updated_at = note.updated_at;
        std::thread::sleep(std::time::Duration::from_millis(2));
        save_note_inner(&conn, &note.id, "title", "body").unwrap();
        let updated = get_or_create_default_note_inner(&conn).unwrap();
        assert!(updated.updated_at > original_updated_at, "updated_at should increase");
    }
}
