# CLAUDE.md

- Answer questions concisely: short direct answer first, minimal detail, no long surveys.
- Project context: see README.md. Feature checklist: notes/features.md. DB design: notes/db-schema.md.
- Jev is the core of the whole product. Jev API docs: https://docs.typesafe.ai/introduction — check them for request/response shapes before designing schema, proxy, or UI. Machine-readable: https://docs.typesafe.ai/llms.txt (index), https://docs.typesafe.ai/api.md (HTTP API ref); any page + `.md`.

## Layout (one repo)
```
backend/     Rust/Axum — one server, one crate
  src/proxy/   Jev interception (/ingest, later /jev/*)
  src/api/     JSON for the React UI (/api/*)
  migrations/  SQL (sqlx, run in order)
frontend/    React + TS (Bun) — landing, docs, dashboard. See frontend/CLAUDE.md
notes/       planning notes
```
- One Axum server serves the proxy, the API, and (later) the built frontend. No separate web server in production.
- Rust is the ONLY thing that touches Postgres and Jev. No business logic in the frontend.

## About the developer
- Software engineering intern, vibe codes heavily. Learning Rust, backend architecture, Postgres and web infra while building this.
- Explain the "why" behind choices, introduce new concepts in a sentence or two, prefer simple idiomatic solutions. Don't assume backend jargon.

## Core value (prioritize in this order)
1. Instant logging of every Jev request/response
2. Web UI to browse and search past decisions, no SQL
3. Outcome grading: an API call tags a past decision good/bad from a real outcome
4. Experimental retrieval (few-shot injection into `state`): opt-in, default OFF, always labeled experimental

## Build order
Rust proxy + logging (hardcoded API key) -> web UI table -> grading -> real API keys / multi-tenancy -> experimental retrieval.
Don't build later steps early. RLS, PgBouncer, partitioning and column encryption are deferred until there are users.

## Rules
- Rust code: follow the `rust-skills` skill (`.claude/skills/rust-skills/`), prioritizing CRITICAL/HIGH rules (ownership, errors, async). Skip micro-optimizations (SmallVec, arenas, SIMD, etc.) unless profiling shows a need — simple, readable code wins while the developer is learning.
- No exotic infra or paid dependencies. Postgres only. `docker compose up` must be enough to start.
- Keep changes small and reviewable; one feature at a time.
- Ask before adding a new dependency; say what it does and why.
- Never commit secrets; use env vars, keep `.env` gitignored.
- Git: default branch `main`. Only commit or push when asked.
