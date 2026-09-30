# CLAUDE.md

- Answer questions concisely: short direct answer first, minimal detail, no long surveys.
- Project context: see README.md. Feature checklist: notes/features.md. DB design: notes/db-schema.md. Roadmap (v1 = see decisions, v2 = self-improving: score-based retrieval + A/B tests): notes/roadmap.md. Retrieval design (SDK-side cache, Langfuse-style): notes/retrieval.md.
- Jev is the core of the whole product. Jev API docs: https://docs.typesafe.ai/introduction — check them for request/response shapes before designing schema, SDKs, or UI. Machine-readable: https://docs.typesafe.ai/llms.txt (index), https://docs.typesafe.ai/api.md (HTTP API ref); any page + `.md`.

## Bun for everything
- All JS/TS tooling is **Bun**: `bun install`, `bun add`, `bun run <script>`, `bunx <tool>`. Never npm, yarn, pnpm or npx.
- Next.js runs on the Bun runtime (`bun --bun next ...`, already wired into `web/package.json` scripts).
- Only exception: the Python SDK in `sdk/python/` (plain Python, standard library only).

## Layout (one repo)
```
web/                  Next.js (App Router) — the only server. See web/CLAUDE.md
  app/page.tsx          landing
  app/docs/             docs
  app/ingest/response/  POST — SDKs send each Jev call here
  app/api/              JSON for the dashboard (/api/*), add routes here
  app/api/auth/         Better Auth endpoints (sign up/in/out, OAuth callbacks)
  app/login/ app/console/  login page + logged-in console (stub; usage goes here)
  lib/auth.ts lib/session.ts lib/db.ts  auth config, getProfile()/requireProfile(), shared pg Pool
  proxy.ts              quick cookie check, redirects /console to /login
  components/ hooks/ styles/ lib/
sdk/
  js/                 @jevdb/sdk — TypeScript, zero deps
  python/             jevdb — standard library only, zero deps
db/migrations/        SQL, run in order (docker compose runs them on a fresh volume)
docker-compose.yml    local Postgres on host port 5433
notes/                planning notes
```
- **Decided (2026-09-26): everything is Next.js + Bun.** One Next.js app serves the landing/docs, the dashboard, SDK ingest and the dashboard API. Rust/Axum and Hono are dropped. Don't reopen unless the developer asks.
- Product is an SDK (JS + Python) that logs asynchronously to JevDB, NOT a proxy in front of Jev. The user's app calls Jev itself, then `jevdb.log()` POSTs request + response to `<JEVDB_URL>/ingest/response`. The hosted URL is TODO; default is `http://localhost:3000`.
- **Decided:** Postgres must be PRIVATE (no public IP). Hosting = Cloud Run + private Cloud SQL (us-west1 Oregon, Direct VPC egress). Vercel is out. Next.js builds with `output: "standalone"` for the container. Region: us-west (Oregon), same as Jev.
- **Decided (2026-09-27): dashboard login built early**, ahead of logging/UI/grading, at the developer's request. Better Auth + our Postgres; the logged-in identity is a **profile** (`profile` table, `profile_id` FKs, `profileId` in code). Email + password always on; GitHub/Google only when their env keys are set. Env: `web/.env.local` (template `web/.env.example`).
- Only server code (route handlers in `web/app/`, helpers in `web/lib/`) touches Postgres. React components never do, and there is no business logic in them.
- **Every query on data tables goes through `withProfile(profileId, fn)`** (`web/lib/db.ts`), and every inserted row sets `profile_id`. Never query data tables with `pool` directly (it's only for Better Auth). This is what lets RLS drop in later without app changes.
- Learning mode: scaffold + TODOs. The developer writes the `/ingest/response` handler body (validation + Postgres write); AI writes the rest and explains it.

## About the developer
- Software engineering intern, vibe codes heavily. Learning TypeScript backends, Next.js, Postgres and web infra while building this.
- Explain the "why" behind choices, introduce new concepts in a sentence or two, prefer simple idiomatic solutions. Don't assume backend jargon.

## Core value (prioritize in this order)
1. Instant logging of every Jev request/response
2. Web UI to browse and search past decisions, no SQL
3. Outcome grading: an API call tags a past decision good/bad from a real outcome
4. Experimental retrieval (few-shot injection into `state`): opt-in, default OFF, always labeled experimental

## Build order
SDK + `/ingest/response` + Postgres logging (hardcoded API key) -> web UI table -> grading -> real API keys / multi-tenancy -> experimental retrieval.
Don't build later steps early. PgBouncer, partitioning and column encryption are deferred until there are users. RLS is deferred too, but must be on **before the hosted launch** (`profile_id` columns + `withProfile()` are already in place for it).

## Rules
- SDKs stay dependency-free and must never throw into or slow down the user's app (fire-and-forget + `flush()`).
- No exotic infra or paid dependencies. Postgres only. `docker compose up` must be enough to start.
- Keep changes small and reviewable; one feature at a time.
- Ask before adding a new dependency; say what it does and why.
- Never commit secrets; use env vars, keep `.env` gitignored.
- Git: default branch `main`. Only commit or push when asked.
