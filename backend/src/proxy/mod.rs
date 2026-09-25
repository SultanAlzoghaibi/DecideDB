use axum::{Router, routing::post};

mod ingest;

// Jev interception: calls from the user's app come in here.
pub fn router() -> Router {
    Router::new().route("/ingest", post(ingest::ingest))
}
