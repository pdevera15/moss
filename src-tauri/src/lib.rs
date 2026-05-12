mod commands;
mod migration_repair;

use fastembed::{EmbeddingModel, InitOptions, TextEmbedding};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

use migration_repair::{repair_sqlx_migrations, EmbeddedMigration};

pub struct EmbeddingState(pub Arc<Mutex<Option<TextEmbedding>>>);

const EMBEDDED_MIGRATIONS: &[EmbeddedMigration] = &[
    EmbeddedMigration {
        version: 1,
        description: "initial_schema",
        sql: include_str!("../migrations/0000_curly_patriot.sql"),
    },
    EmbeddedMigration {
        version: 2,
        description: "add_tasks",
        sql: include_str!("../migrations/0001_solid_maelstrom.sql"),
    },
    EmbeddedMigration {
        version: 3,
        description: "add_fts5",
        sql: include_str!("../migrations/0002_add_fts5.sql"),
    },
    EmbeddedMigration {
        version: 4,
        description: "add_due_date",
        sql: include_str!("../migrations/0003_fair_paladin.sql"),
    },
    EmbeddedMigration {
        version: 5,
        description: "add_embeddings",
        sql: include_str!("../migrations/0004_add_embeddings.sql"),
    },
    EmbeddedMigration {
        version: 6,
        description: "add_settings",
        sql: include_str!("../migrations/0005_add_settings.sql"),
    },
    EmbeddedMigration {
        version: 7,
        description: "add_language",
        sql: include_str!("../migrations/0006_add_language.sql"),
    },
];

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations: Vec<Migration> = EMBEDDED_MIGRATIONS
        .iter()
        .map(|m| Migration {
            version: m.version,
            description: m.description,
            sql: m.sql,
            kind: MigrationKind::Up,
        })
        .collect();

    let embedding_arc: Arc<Mutex<Option<TextEmbedding>>> = Arc::new(Mutex::new(None));
    let embedding_arc_init = Arc::clone(&embedding_arc);

    tauri::Builder::default()
        .manage(EmbeddingState(Arc::clone(&embedding_arc)))
        .setup(move |app| {
            if let Ok(config_dir) = app.path().app_config_dir() {
                let db_path = config_dir.join("moss.db");
                match repair_sqlx_migrations(&db_path, EMBEDDED_MIGRATIONS) {
                    Ok(n) if n > 0 => eprintln!("[moss] repaired {n} migration checksum row(s)"),
                    Ok(_) => {}
                    Err(e) => eprintln!("[moss] migration repair skipped: {e}"),
                }
            }

            let state = Arc::clone(&embedding_arc_init);
            tauri::async_runtime::spawn(async move {
                let result = tokio::task::spawn_blocking(|| {
                    TextEmbedding::try_new(InitOptions::new(
                        EmbeddingModel::ParaphraseMLMiniLML12V2,
                    ))
                })
                .await;
                match result {
                    Ok(Ok(model)) => {
                        *state.lock().unwrap() = Some(model);
                    }
                    Ok(Err(e)) => eprintln!("[moss] embedding model init failed: {e}"),
                    Err(e) => eprintln!("[moss] embedding spawn_blocking panicked: {e}"),
                }
            });
            Ok(())
        })
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:moss.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::notes::search_notes,
            commands::search::embed_note,
            commands::search::semantic_search,
            commands::search::check_reindex_needed,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
