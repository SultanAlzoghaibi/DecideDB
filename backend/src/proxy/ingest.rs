use axum::{Json, http::StatusCode};
use serde_json::{Value, json};

// Accepts any JSON body. Later: validate Jev shape + write to Postgres.
pub async fn ingest(Json(payload): Json<Value>) -> (StatusCode, Json<Value>) {
    println!("ingest: {payload}");
    (StatusCode::OK, Json(json!({ "status": "ok" })))

}
