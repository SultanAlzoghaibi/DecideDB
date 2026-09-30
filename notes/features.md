# JevDB Features

## Base (MVP)
- [x] JS SDK (`sdk/js`) → background POST to `/ingest/response`
- [x] Python SDK (`sdk/python`) → background POST to `/ingest/response`
- [ ] `/ingest/response` writes request/response to Postgres (state, questions, answers, confidence, latency)
- [ ] Hosted JevDB URL (SDK default is localhost for now)
- [ ] Single hardcoded API key
- [ ] Docker Compose (web + postgres) — postgres done (`docker-compose.yml`), web container TODO

## Web UI
- [ ] Decisions table (newest first, paginated)
- [ ] Search / filter (question type, confidence, date)
- [ ] Decision detail view (full JSON)

## Grading
- [ ] `POST /api/decisions/:id/grade` (good/bad + source)
- [ ] Grade button in UI
- [ ] Show grades in table

## Multi-tenancy
- [x] `profile_id` on every data table (`0004_profiles_context.sql`) + `withProfile()` query helper
- [ ] Projects (a profile owns several) — optional, later
- [ ] Hashed, rotatable API keys
- [ ] Postgres RLS (per-transaction context) — **before the hosted launch**. Needs: restricted `jevdb_app` DB role, `ENABLE ROW LEVEL SECURITY` + policy `profile_id = current_setting('app.current_profile_id')::uuid` on data tables (not on Better Auth tables)
- [x] Web UI login (Better Auth: email + password, optional GitHub/Google) → `/console` stub
- [x] Email verification for email + password sign-ups: 4-digit code (Better Auth `emailOTP`), sent via Resend (`web/lib/email.ts`); dev without `RESEND_API_KEY` prints codes in the terminal

## Scale / Ops
- [ ] PgBouncer pooling
- [ ] Time-based partitioning
- [ ] Configurable retention
- [ ] Encryption at rest for `state`

## Version 2 (see notes/roadmap.md): experimental, opt-in, default off
- [ ] Retrieve best-graded past examples
- [ ] Jev judges relevance
- [ ] Inject into `state` or the matching criteria `examples` as few-shot context
- [ ] A/B test: retrieval on vs off
- [ ] A/B test: question versions
