mod api;
mod proxy;

use axum::Router;
use tower_http::services::ServeDir;

#[tokio::main]
async fn main() {
    // Built React app (`bun run build` in frontend/). Relative to backend/.
    let frontend_dir = std::env::var("FRONTEND_DIR").unwrap_or_else(|_| "../frontend/dist".into());

    let app = Router::new()
        .merge(proxy::router())
        .nest("/api", api::router())
        // Anything not matched above: serve files (index.html, js, css) from dist/.
        .fallback_service(ServeDir::new(&frontend_dir));

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".into());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    println!("JevDB listening on http://localhost:{port} (frontend: {frontend_dir})");
    axum::serve(listener, app).await.unwrap();
}
