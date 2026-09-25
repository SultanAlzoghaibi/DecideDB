# Frontend

The browser UI for JevDB. It only talks to the Rust API over HTTP. It never connects to Postgres or Jev directly.

## Stack
- React + TypeScript, built with Bun. Bun is dev/build only; in production the built `dist/` is served by the Axum backend (see root `CLAUDE.md`). Keep it simple: prefer few dependencies and plain, readable components.

## Screens (in build order)
1. Requests table: time, question type, answer, confidence, grade. Searchable and sortable.
2. Request detail: full state, each question with its answer/probabilities, raw JSON.
3. Grading: mark a decision good/bad from the detail view.
4. Settings (later): API keys, experimental retrieval toggle (labeled experimental, default off).

## Design
- The design system lives in `frontend/DESIGN.md`. Read it before building any UI and follow it exactly. It blends Linear (foundation) and Supabase (attitude) from https://styles.refero.design/.
- 60-30-10: dark surfaces 60%, grey structure 30%, `#D45BB6` accent 10%. The accent is also the hover outline and focus color on every interactive element.
- Clean, dense, developer-tool feel: table-first, minimal chrome, no shadows or gradients.
- Dark theme only for now. Define colors and spacing as CSS variables in one place (the tokens in DESIGN.md), not scattered values.
- Show confidence visually (e.g. bar or badge) instead of only a number.
- Handle empty, loading and error states on every screen.

## Rules
- All data comes from the Rust API. If an endpoint is missing, note it instead of faking data in the UI (use clearly marked mock data only while the API doesn't exist).
- Keep components small. Explain any non-obvious pattern in a short comment or in your reply.
