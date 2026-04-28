use crate::EmbeddingState;
use serde::Serialize;
use std::sync::Arc;
use tauri::Manager;

#[derive(Serialize)]
pub struct SemanticResult {
    pub id: String,
    pub title: String,
    pub score: f32,
}

pub fn l2_normalize(v: &mut Vec<f32>) {
    let norm: f32 = v.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm > 1e-10 {
        v.iter_mut().for_each(|x| *x /= norm);
    }
}

#[tauri::command]
pub async fn embed_note(
    note_id: String,
    title: String,
    body: String,
    state: tauri::State<'_, EmbeddingState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let text = format!("{} {}", title, body);
    let model_arc = Arc::clone(&state.0);

    let mut vector = tokio::task::spawn_blocking(move || -> Result<Vec<f32>, String> {
        let mut guard = model_arc.lock().unwrap();
        let model = guard.as_mut().ok_or("embedding model not ready")?;
        let mut emb = model.embed(vec![text], None).map_err(|e| e.to_string())?;
        emb.pop().ok_or_else(|| "no embedding returned".to_string())
    })
    .await
    .map_err(|e| e.to_string())??;

    l2_normalize(&mut vector);
    let bytes: Vec<u8> = vector.iter().flat_map(|f| f.to_le_bytes()).collect();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);

    let db_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("moss.db");
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO embeddings (note_id, vector, updated_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![note_id, bytes, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn semantic_search(
    query: String,
    state: tauri::State<'_, EmbeddingState>,
    app_handle: tauri::AppHandle,
) -> Result<Vec<SemanticResult>, String> {
    let q = query.trim().to_string();
    if q.is_empty() {
        return Ok(vec![]);
    }

    let model_arc = Arc::clone(&state.0);
    let q_clone = q.clone();
    let mut query_vec = tokio::task::spawn_blocking(move || -> Result<Vec<f32>, String> {
        let mut guard = model_arc.lock().unwrap();
        let model = guard.as_mut().ok_or("embedding model not ready")?;
        let mut emb = model.embed(vec![q_clone], None).map_err(|e| e.to_string())?;
        emb.pop().ok_or_else(|| "no embedding returned".to_string())
    })
    .await
    .map_err(|e| e.to_string())??;

    l2_normalize(&mut query_vec);

    let db_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .join("moss.db");
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT e.note_id, e.vector, n.title
             FROM embeddings e
             JOIN notes n ON n.id = e.note_id",
        )
        .map_err(|e| e.to_string())?;

    let mut results: Vec<SemanticResult> = stmt
        .query_map([], |row| {
            let note_id: String = row.get(0)?;
            let bytes: Vec<u8> = row.get(1)?;
            let title: String = row.get(2)?;
            Ok((note_id, bytes, title))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .filter_map(|(id, bytes, title)| {
            if bytes.len() != 384 * 4 {
                return None;
            }
            let stored: Vec<f32> = bytes
                .chunks_exact(4)
                .map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]]))
                .collect();
            let score: f32 = query_vec.iter().zip(stored.iter()).map(|(a, b)| a * b).sum();
            if score > 0.20 {
                Some(SemanticResult { id, title, score })
            } else {
                None
            }
        })
        .collect();

    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(5);
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_l2_normalize_produces_unit_vector() {
        let mut v = vec![3.0_f32, 4.0];
        l2_normalize(&mut v);
        let norm: f32 = v.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-6, "norm was {norm}");
        assert!((v[0] - 0.6).abs() < 1e-6);
        assert!((v[1] - 0.8).abs() < 1e-6);
    }

    #[test]
    fn test_l2_normalize_zero_vector_does_not_panic() {
        let mut v = vec![0.0_f32, 0.0, 0.0];
        l2_normalize(&mut v);
        assert_eq!(v, vec![0.0_f32, 0.0, 0.0]);
    }

    #[test]
    fn test_cosine_identical_normalized_vectors_score_one() {
        let mut a = vec![1.0_f32, 0.0, 0.0];
        let mut b = vec![1.0_f32, 0.0, 0.0];
        l2_normalize(&mut a);
        l2_normalize(&mut b);
        let score: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        assert!((score - 1.0).abs() < 1e-6, "score was {score}");
    }

    #[test]
    fn test_cosine_orthogonal_normalized_vectors_score_zero() {
        let mut a = vec![1.0_f32, 0.0];
        let mut b = vec![0.0_f32, 1.0];
        l2_normalize(&mut a);
        l2_normalize(&mut b);
        let score: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        assert!(score.abs() < 1e-6, "score was {score}");
    }
}
