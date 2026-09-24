# JevDB Features

## Base (MVP)
- [ ] Rust/Axum proxy → forwards calls to Jev
- [ ] Log request/response to Postgres (state, questions, answers, confidence, latency)
- [ ] Async logging queue (no added latency)
- [ ] Single hardcoded API key
- [ ] Docker Compose (api + postgres)

## Web UI
- [ ] Decisions table (newest first, paginated)
- [ ] Search / filter (question type, confidence, date)
- [ ] Decision detail view (full JSON)

## Grading
- [ ] `POST /api/decisions/:id/grade` (good/bad + source)
- [ ] Grade button in UI
- [ ] Show grades in table

## Multi-tenancy
- [ ] Projects + `project_id` on all tables
- [ ] Hashed, rotatable API keys
- [ ] Postgres RLS (per-transaction context)
- [ ] Web UI login

## Scale / Ops
- [ ] PgBouncer pooling
- [ ] Time-based partitioning
- [ ] Configurable retention
- [ ] Encryption at rest for `state`

## Experimental (opt-in, default off)
- [ ] Retrieve best-graded past examples
- [ ] Jev judges relevance
- [ ] Inject into `state` as few-shot context
