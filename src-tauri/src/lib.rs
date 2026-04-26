mod commands;

use std::sync::{Arc, Mutex};
use fastembed::{TextEmbedding, InitOptions, EmbeddingModel};
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

pub struct EmbeddingState(pub Arc<Mutex<Option<TextEmbedding>>>);

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
        Migration {
            version: 5,
            description: "add_embeddings",
            sql: include_str!("../migrations/0004_add_embeddings.sql"),
            kind: MigrationKind::Up,
        },
    ];

    let embedding_arc: Arc<Mutex<Option<TextEmbedding>>> = Arc::new(Mutex::new(None));
    let embedding_arc_init = Arc::clone(&embedding_arc);

    tauri::Builder::default()
        .manage(EmbeddingState(Arc::clone(&embedding_arc)))
        .setup(move |_app| {
            let state = Arc::clone(&embedding_arc_init);
            tauri::async_runtime::spawn(async move {
                let result = tokio::task::spawn_blocking(|| {
                    TextEmbedding::try_new(InitOptions::new(EmbeddingModel::AllMiniLML6V2))
                })
                .await;
                match result {
                    Ok(Ok(model)) => { *state.lock().unwrap() = Some(model); }
                    Ok(Err(e)) => eprintln!("[moss] embedding model init failed: {e}"),
                    Err(e) => eprintln!("[moss] embedding spawn_blocking panicked: {e}"),
                }
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(SqlBuilder::default().add_migrations("sqlite:moss.db", migrations).build())
        .invoke_handler(tauri::generate_handler![
            commands::notes::search_notes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
