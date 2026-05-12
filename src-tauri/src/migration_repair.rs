use rusqlite::{params, Connection, OptionalExtension};
use sha2::{Digest, Sha384};
use std::path::Path;

#[derive(Clone, Copy)]
pub struct EmbeddedMigration {
    pub version: i64,
    pub description: &'static str,
    pub sql: &'static str,
}

pub fn repair_sqlx_migrations(
    db_path: &Path,
    migrations: &[EmbeddedMigration],
) -> rusqlite::Result<usize> {
    if !db_path.exists() {
        return Ok(0);
    }
    let conn = Connection::open(db_path)?;

    let table_present: Option<i64> = conn
        .query_row(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='_sqlx_migrations'",
            [],
            |r| r.get(0),
        )
        .optional()?;
    if table_present.is_none() {
        return Ok(0);
    }

    let mut repaired = 0usize;
    for m in migrations {
        let stored: Option<Vec<u8>> = conn
            .query_row(
                "SELECT checksum FROM _sqlx_migrations WHERE version = ?1",
                params![m.version],
                |r| r.get(0),
            )
            .optional()?;
        let Some(stored) = stored else { continue };

        let canonical = sha384(m.sql.as_bytes());
        if stored == canonical {
            continue;
        }

        let lf = m.sql.replace("\r\n", "\n");
        let crlf = lf.replace('\n', "\r\n");
        let lf_hash = sha384(lf.as_bytes());
        let crlf_hash = sha384(crlf.as_bytes());

        if stored == lf_hash || stored == crlf_hash {
            conn.execute(
                "UPDATE _sqlx_migrations SET checksum = ?1, success = 1 WHERE version = ?2",
                params![canonical, m.version],
            )?;
            repaired += 1;
            eprintln!(
                "[moss] repaired migration v{} ({}) — line-ending checksum drift",
                m.version, m.description
            );
        } else {
            eprintln!(
                "[moss] migration v{} ({}) checksum mismatch is not a line-ending variant — leaving for sqlx to report",
                m.version, m.description
            );
        }
    }
    Ok(repaired)
}

fn sha384(bytes: &[u8]) -> Vec<u8> {
    let mut h = Sha384::new();
    h.update(bytes);
    h.finalize().to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use tempfile::NamedTempFile;

    fn seed(conn: &Connection, version: i64, desc: &str, checksum: &[u8]) {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS _sqlx_migrations (
                version BIGINT PRIMARY KEY,
                description TEXT NOT NULL,
                installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN NOT NULL,
                checksum BLOB NOT NULL,
                execution_time BIGINT NOT NULL
            )",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO _sqlx_migrations (version, description, success, checksum, execution_time)
             VALUES (?1, ?2, 1, ?3, 0)",
            params![version, desc, checksum],
        )
        .unwrap();
    }

    fn read_checksum(conn: &Connection, version: i64) -> Vec<u8> {
        conn.query_row(
            "SELECT checksum FROM _sqlx_migrations WHERE version = ?1",
            params![version],
            |r| r.get(0),
        )
        .unwrap()
    }

    #[test]
    fn repairs_crlf_drift_to_lf_canonical() {
        let lf_sql = "CREATE TABLE foo (id INT);\nCREATE INDEX bar ON foo(id);\n";
        let crlf_sql = lf_sql.replace('\n', "\r\n");

        let f = NamedTempFile::new().unwrap();
        let conn = Connection::open(f.path()).unwrap();
        seed(&conn, 1, "test", &sha384(crlf_sql.as_bytes()));
        drop(conn);

        let migs = [EmbeddedMigration {
            version: 1,
            description: "test",
            sql: lf_sql,
        }];
        let n = repair_sqlx_migrations(f.path(), &migs).unwrap();
        assert_eq!(n, 1);

        let conn = Connection::open(f.path()).unwrap();
        assert_eq!(read_checksum(&conn, 1), sha384(lf_sql.as_bytes()));
    }

    #[test]
    fn repairs_lf_drift_to_crlf_canonical() {
        let lf_sql = "CREATE TABLE foo (id INT);\n";
        let crlf_sql: &'static str = Box::leak(lf_sql.replace('\n', "\r\n").into_boxed_str());

        let f = NamedTempFile::new().unwrap();
        let conn = Connection::open(f.path()).unwrap();
        seed(&conn, 1, "test", &sha384(lf_sql.as_bytes()));
        drop(conn);

        let migs = [EmbeddedMigration {
            version: 1,
            description: "test",
            sql: crlf_sql,
        }];
        let n = repair_sqlx_migrations(f.path(), &migs).unwrap();
        assert_eq!(n, 1);

        let conn = Connection::open(f.path()).unwrap();
        assert_eq!(read_checksum(&conn, 1), sha384(crlf_sql.as_bytes()));
    }

    #[test]
    fn no_op_when_already_matching() {
        let sql = "CREATE TABLE foo (id INT);\n";
        let f = NamedTempFile::new().unwrap();
        let conn = Connection::open(f.path()).unwrap();
        seed(&conn, 1, "test", &sha384(sql.as_bytes()));
        drop(conn);

        let migs = [EmbeddedMigration {
            version: 1,
            description: "test",
            sql,
        }];
        let n = repair_sqlx_migrations(f.path(), &migs).unwrap();
        assert_eq!(n, 0);
    }

    #[test]
    fn leaves_genuine_content_diff_alone() {
        let stored_sql = "CREATE TABLE foo (id INT);\n";
        let new_sql = "CREATE TABLE foo (id INT, name TEXT);\n";

        let f = NamedTempFile::new().unwrap();
        let conn = Connection::open(f.path()).unwrap();
        seed(&conn, 1, "test", &sha384(stored_sql.as_bytes()));
        drop(conn);

        let migs = [EmbeddedMigration {
            version: 1,
            description: "test",
            sql: new_sql,
        }];
        let n = repair_sqlx_migrations(f.path(), &migs).unwrap();
        assert_eq!(n, 0);

        let conn = Connection::open(f.path()).unwrap();
        assert_eq!(read_checksum(&conn, 1), sha384(stored_sql.as_bytes()));
    }

    #[test]
    fn skips_when_db_missing() {
        let path =
            std::env::temp_dir().join(format!("moss-no-such-db-{}.sqlite", std::process::id()));
        let _ = std::fs::remove_file(&path);
        let migs = [EmbeddedMigration {
            version: 1,
            description: "x",
            sql: "x",
        }];
        let n = repair_sqlx_migrations(&path, &migs).unwrap();
        assert_eq!(n, 0);
    }

    #[test]
    fn skips_when_table_missing() {
        let f = NamedTempFile::new().unwrap();
        let _conn = Connection::open(f.path()).unwrap();
        let migs = [EmbeddedMigration {
            version: 1,
            description: "x",
            sql: "x",
        }];
        let n = repair_sqlx_migrations(f.path(), &migs).unwrap();
        assert_eq!(n, 0);
    }

    #[test]
    fn skips_versions_not_yet_applied() {
        let sql_v1 = "CREATE TABLE a (id INT);\n";
        let f = NamedTempFile::new().unwrap();
        let conn = Connection::open(f.path()).unwrap();
        seed(&conn, 1, "v1", &sha384(sql_v1.as_bytes()));
        drop(conn);

        let migs = [
            EmbeddedMigration {
                version: 1,
                description: "v1",
                sql: sql_v1,
            },
            EmbeddedMigration {
                version: 2,
                description: "v2",
                sql: "CREATE TABLE b (id INT);\n",
            },
        ];
        let n = repair_sqlx_migrations(f.path(), &migs).unwrap();
        assert_eq!(n, 0);

        let conn = Connection::open(f.path()).unwrap();
        let row: Option<Vec<u8>> = conn
            .query_row(
                "SELECT checksum FROM _sqlx_migrations WHERE version = 2",
                [],
                |r| r.get(0),
            )
            .optional()
            .unwrap();
        assert!(row.is_none());
    }
}
