# DecideDB

> The "Supabase for Jev" — a self-hosted, open-source logging layer for TypeSafe's Jev API. A tiny SDK (JS or Python) sends every request/response to DecideDB in the background, where it lands in Postgres, shows up in a web UI, and can be graded against real outcomes.

## Why

- Jev has zero built-in memory or self-serve request history — every call is stateless and disappears the moment it returns.
- A vibecoder building fast doesn't want to design a Postgres schema, write logging code, and build a review UI from scratch before they can even see what their AI decisions are doing.
- Same reason people reach for Supabase instead of standing up their own Postgres + auth + dashboard: the underlying tech (Postgres) is not hard, but nobody wants to assemble the boring plumbing themselves when it's already sitting there ready to `docker run`.
- Postgres is cheap and well-understood — no exotic infra, no per-seat SaaS logging bill, self-hostable for basically free. That matters to someone prototyping fast who doesn't want to burn budget on observability tooling.

## Features

1. **Instant logging** — every request/response (state, questions, answers, confidence) is captured automatically, so you can build and actually see what Jev is doing without setting anything up.
2. **Web UI** — browse and search past decisions in a table view, no raw SQL needed.
3. **Outcome grading** — a simple API call to tag a past decision as good/bad based on a real outcome (a win, a resolved ticket), not manual review.

### Experimental: retrieval (not the pitch)

Jev itself judges which past graded examples are relevant, and those get injected into a new request's `state` as few-shot context, aiming to nudge future accuracy.

This is **explicitly unproven**. TypeSafe's own docs warn that `state` is steerable by design, and academic literature plus prior art show few-shot injection is unstable — it can help, hurt, or do nothing. Ship it as an optional, clearly-labeled experimental toggle, never the headline feature. Design: examples are cached inside the SDK (like [Langfuse prompt caching](https://langfuse.com/docs/prompt-management/features/caching)) so retrieval never adds a network hop to the Jev call. See `notes/retrieval.md`. At launch, frame it as a "help me test this" call for ML-minded collaborators.

## Jev API mechanics

- `state` — the raw evidence text.
- `questions` — what you're asking about it. Same state, any number of independent questions, one typed answer per question.
- Three question types only:
  - **Noul** — yes/no
  - **Choice** — pick one; returns the full probability breakdown
  - **Score** — numeric scale

## Architecture (decided)

```
your app ──Jev call──────────────────────────▶ Jev API
   │ decidedb.log(request, response)  (background, never blocks)
   ▼
DecideDB (Next.js on Bun) ── POST /ingest/response ──▶ Postgres
   ▲
browser ── dashboard + /api/* ─┘
```

- **SDK, not a proxy.** Your app keeps calling Jev directly, so DecideDB can never add latency or downtime to a Jev call. The JS (`sdk/js`) and Python (`sdk/python`) SDKs queue each call and POST it to `/ingest/response` in the background.
- **One Next.js app** (`web/`), run with Bun, serves the landing/docs, the dashboard, SDK ingest and the dashboard API.
- **Postgres**, not a time-series DB. Normalized columns for hot-query fields (confidence, answer, timestamp) alongside raw JSONB for the full payload. SQL lives in `db/migrations/`.
- **Multi-tenancy** via `project_id` + Postgres Row Level Security (RLS) as a database-level backstop beneath app-level checks. Tenant context is set fresh per-transaction so it stays safe with connection pooling.
- **Hashed, rotatable API keys.**
- **PgBouncer** connection pooling.
- **Time-based table partitioning** + configurable retention.
- **Encryption at rest** for `state`.
- **Region:** us-west (Oregon). Latency tests put Jev there (Cloudflare edge → origin ≈ 15–25 ms from Vancouver). Run the server + Postgres in the same region.
- **Hosting:** Cloud Run (Next.js `standalone` build) + private Cloud SQL Postgres (no public IP). `docker compose up` for local dev.
- Only server code in `web/` (route handlers + `web/lib/`) touches Postgres; no business logic in React components.

## Competitive landscape

Searched HN, Reddit, and the awesome-jev lists:

- **jev-trust**, **jev-harness** — logging/monitoring, no retrieval loop.
- **Jeview** — closest match: local proxy + SQLite + live dashboard. But explicitly localhost-only, no login, "not for public deployment."
- **DecideDB's gap:** Postgres-backed with RLS, built for safe multi-tenant hosting. No exact match found.

LLM-world analogues worth studying: **Helicone** (proxy-based logging), **Langfuse** (open-source, Postgres, scores/grading), **LangSmith**.

## Naming & IP

"DecideDB" (renamed from JevDB on 2026-10-02). A generic name instead of a `jev-` prefix: no trademark risk from building on TypeSafe's product name, and it still fits if other decision models are supported later. Postgres user/database names and GitHub repo names still say `jevdb` until they are migrated or renamed.

## Launch plan

- **Target:** Sunday.
- **Channels:** Show HN, r/LocalLLaMA, X / Jev community, awesome-jev PRs, TypeSafe Discord.
- **Pitch:** lead with the concrete pain point (no logging exists today). Keep the RAG angle as a "help me test this" call to action.

## Notes for AI assistants

- **The author is learning** while building this: TypeScript backends, Next.js, Postgres, and web infra. Everything JS/TS runs on Bun. The goal is to build a vibecoder-friendly, Supabase-style tool *and* understand how it works. Explain the "why" behind choices, introduce new concepts briefly, and prefer simple, idiomatic solutions over clever ones.
- Core value = logging + web UI + grading. Prioritize these over the retrieval feature.
- Keep setup friction near zero: `docker compose up` should be enough to get started.
- Storage is Postgres. Avoid exotic infra or paid dependencies.
- Retrieval must stay opt-in and default off.
- Suggested build order: SDK + `/ingest/response` + logging (hardcoded API key) → web UI table → grading → real API keys/multi-tenancy → experimental retrieval.
