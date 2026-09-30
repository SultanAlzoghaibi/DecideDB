# DB Schema Plan

Source: https://docs.typesafe.ai/api.md

## Jev API recap
- `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer <key>`
- Request: `{ state, model, questions: { <key>: { type, instructions, criteria } } }`
  - `state` = string | object | array
  - `type` = `noul` | `choice` | `score`
- Response: `{ model, answers: { <key>: Answer }, usage: { input_tokens, output_tokens } }`
  - noul → `noul` (0–1)
  - choice → `choice`, `probabilities`, `confidence`
  - score → `score`, `legend`, `probabilities`, `confidence`
- Errors: 401, 422, 429, 529

## Key insight
1 request = 1 state + N questions → N answers.
**Grade per answer**, not per request (each question = one decision).

## Tables
SQL: `db/migrations/0001_input.sql` (request side) + `db/migrations/0002_response.sql` (response + grades) — fully relational (every JSON field -> rows).

```
states ──< requests ──< answers >── question_versions >── instructions
               │           │               │
               │           │               └──< criteria (options / levels)
               │           ├── noul_answers    (1:1)
               │           ├── choice_answers  (1:1) ──> chosen criterion
               │           ├── score_answers   (1:1)
               │           ├──< answer_probabilities ──> criterion
               │           └──< grades
               └──< request_questions >── question_versions
```
- `states`, `instructions` — deduped by hash
- `question_versions` — key + type + instructions + criteria; new wording = new version
- `criteria` — 1 row per choice option / score level / noul true-false
- `answers` + `*_answers` — base row + per-type values
- `answer_probabilities` — 1 row per option/level probability
- `grades` — good/bad per answer
- Free-form content: `text` if string, `body` JSONB if structured (Jev allows both)
- `blob_req` / `blob_response` (keyed by `req_id`) — blob backup tables, top of each file, droppable

## Auth (`db/migrations/0003_auth.sql`)
Owned by Better Auth (`web/lib/auth.ts`); regenerate with its CLI, don't hand-edit.
- `profile` — one row per person who can log in. **Naming rule:** Better Auth calls it `user`; JevDB calls it a profile: table `profile`, FK column `profile_id`, `profileId` in code (`web/lib/session.ts`).
- `session` (logged-in browsers), `account` (login methods; `password` is a hash), `verification` (short-lived codes).
- Better Auth's own columns are camelCase (`"emailVerified"`), so quote them in SQL.

## Ownership, caller info and context (`db/migrations/0004_profiles_context.sql`)
- **Every data table has `profile_id`** (FK to `profile`, cascade delete). Every query filters by it; the dashboard only ever shows the logged-in profile's rows. It's on child tables too, so RLS can later check each table directly.
- Dedupe is per profile: `UNIQUE (profile_id, hash)` on `states`, `instructions`, `question_versions`.
- `requests` also holds what the SDK sends: `decision_id` (unique per profile, makes retried sends a no-op), `started_at`, `latency_ms`, `user_id`, `group_id`, `sdk`, and `context_added`.
- `request_tags (request_id, tag)`: any number of free labels per call.
- `context`: when JevDB auto-adds context to a call (retrieval examples), the exact added context (`body` JSONB), its `source` and `example_set`; one per request. `requests.context_added` is true exactly when a `context` row exists.
- Code: `web/lib/decisions.ts` (`saveDecision`, `listDecisions`, `getDecision`). Dummy data: `bun run db:seed` in `web/`.

## Applying migrations
Docker runs `db/migrations/*.sql` only on a fresh volume. After that: `bun run db:migrate` (in `web/`) applies new files and records them in `schema_migrations`. When adding a migration, also add its "already applied?" check to `APPLIED_IF` in `web/scripts/migrate.ts`.

## Later
- `projects.profile_id` (owner) -> projects own requests, API keys, etc.
- `project_id` on all tables (profiles own projects) + RLS
- Partition `requests` by month
- Never store the `Authorization` header
