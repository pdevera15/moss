#[derive(serde::Serialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub body: String,
    pub updated_at: i64,
}

#[tauri::command]
pub async fn search_notes(
    query: String,
    app_handle: tauri::AppHandle,
) -> Result<Vec<SearchResult>, String> {
    use tauri::Manager;
    let db_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("moss.db");

    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT notes.id, notes.title, notes.body, notes.updated_at
             FROM notes_fts
             JOIN notes ON notes.rowid = notes_fts.rowid
             WHERE notes_fts MATCH ?1
             ORDER BY notes_fts.rank LIMIT 20",
        )
        .map_err(|e| e.to_string())?;

    let results = stmt
        .query_map([&query], |row| {
            Ok(SearchResult {
                id: row.get(0)?,
                title: row.get(1)?,
                body: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}
