mod api;
mod proxy;

use axum::Router;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .merge(proxy::router())
        .nest("/api", api::router());

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".into());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    println!("JevDB listening on http://localhost:{port}");
    axum::serve(listener, app).await.unwrap();
}
