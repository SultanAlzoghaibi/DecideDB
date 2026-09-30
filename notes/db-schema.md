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
- `states`, `instructions` — deduped by hash, **per profile**
- `question_versions` — key + type + instructions + criteria; new wording = new version
- `criteria` — 1 row per choice option / score level / noul true-false
- `answers` + `*_answers` — base row + per-type values
- `answer_probabilities` — 1 row per option/level probability
- `grades` — good/bad per answer
- Free-form content: `text` if string, `body` JSONB if structured (Jev allows both)
- `blob_req` / `blob_response` (keyed by `req_id`) — blob backup tables, top of each file, droppable

## Ownership (`db/migrations/0004_profile_ownership.sql`)
- Every data table above has `profile_id` (NOT NULL, FK -> `profile`, ON DELETE CASCADE). On every table, not just `requests`, so RLS is one rule per table with no joins.
- Dedup hashes are unique per `(profile_id, hash)`, never shared across profiles.
- App side: query data tables only via `withProfile(profileId, fn)` in `web/lib/db.ts`. It runs one transaction with `app.current_profile_id` set (transaction-local, safe with pooling). RLS policies (planned) will read that setting.

## Auth (`db/migrations/0003_auth.sql`)
Owned by Better Auth (`web/lib/auth.ts`); regenerate with its CLI, don't hand-edit.
- `profile` — one row per person who can log in. **Naming rule:** Better Auth calls it `user`; JevDB calls it a profile: table `profile`, FK column `profile_id`, `profileId` in code (`web/lib/session.ts`).
- `session` (logged-in browsers), `account` (login methods; `password` is a hash), `verification` (short-lived codes).
- Better Auth's own columns are camelCase (`"emailVerified"`), so quote them in SQL.

## Later
- `projects.profile_id` (owner) -> projects own requests, API keys, etc.
- RLS policies + restricted app DB role (before hosted launch)
- Partition `requests` by month
- Never store the `Authorization` header
