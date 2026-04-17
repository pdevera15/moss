// src-tauri/src/lib.rs
mod commands;

use std::sync::Mutex;
use rusqlite::Connection;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()
                .map_err(|e| format!("Failed to get app data dir: {e}"))?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("moss.db");
            let conn = Connection::open(&db_path)
                .map_err(|e| format!("Failed to open database at {}: {e}", db_path.display()))?;
            commands::notes::run_migrations(&conn)
                .map_err(|e| format!("Migration failed: {e}"))?;
            app.manage(Mutex::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::notes::get_or_create_default_note,
            commands::notes::save_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
