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
        Migration {
            version: 2,
            description: "add_tasks",
            sql: include_str!("../migrations/0001_solid_maelstrom.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_fts5",
            sql: include_str!("../migrations/0002_add_fts5.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_due_date",
            sql: include_str!("../migrations/0003_fair_paladin.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(SqlBuilder::default().add_migrations("sqlite:moss.db", migrations).build())
        .invoke_handler(tauri::generate_handler![
            commands::notes::search_notes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
