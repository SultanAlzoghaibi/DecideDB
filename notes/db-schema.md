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
SQL: `backend/migrations/0001_input.sql` (request side) + `backend/migrations/0002_response.sql` (response + grades) — fully relational (every JSON field -> rows).

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

## Later
- `project_id` on all tables + RLS
- Partition `requests` by month
- Never store the `Authorization` header
