mod commands;

use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial_schema",
            sql: include_str!("../migrations/0000_curly_patriot.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(SqlBuilder::default().add_migrations("sqlite:moss.db", migrations).build())
        .invoke_handler(tauri::generate_handler![
            // CRUD handled by Drizzle ORM in TypeScript
            // Future: FTS5 and embedding commands go here
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
