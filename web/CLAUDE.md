# web/

The DecisionDB Next.js app (App Router), run with Bun. It is the only server: landing, docs, dashboard, SDK ingest and the dashboard API all live here. See the root `CLAUDE.md` for the big picture.

## Stack
- Next.js + React + TypeScript on Bun. `bun run dev` / `bun run build` / `bun run start`. Keep it simple: few dependencies, plain readable components.
- Imports use the `@/` alias for this folder (e.g. `@/components/Nav`).

## Where things go
- `app/**/page.tsx` — pages. Server components by default; add `"use client"` only to components that need state, effects or browser APIs.
- `app/ingest/response/route.ts` — where the SDKs POST each Jev call.
- `app/api/**/route.ts` — JSON endpoints for the dashboard.
- `app/diagrams/` — design review page showing every version of the how-it-works diagram (`components/SdkFlow.tsx`). Not linked from the site; keep it for comparing designs. The landing page uses C2 (`SdkFlowOneDb`, one DecisionDB under the SDK) for the basic flow and RAG 3 (`SdkFlowRagStack`) for the advanced ML section.
- `lib/` — server helpers (Postgres client, etc.). Only route handlers and server code import DB code, never client components.

## Screens (in build order)
1. Requests table: time, question type, answer, confidence, grade. Searchable and sortable.
2. Request detail: full state, each question with its answer/probabilities, raw JSON.
3. Grading: mark a decision good/bad from the detail view.
4. Settings (later): API keys, experimental retrieval toggle (labeled experimental, default off).

## Design
- The design system lives in `web/DESIGN.md`. Read it before building any UI and follow it exactly. It blends Linear (foundation) and Supabase (attitude) from https://styles.refero.design/.
- 60-30-10: dark surfaces 60%, grey structure 30%, `#D45BB6` accent 10%. The accent is also the hover outline and focus color on every interactive element.
- Clean, dense, developer-tool feel: table-first, minimal chrome, no shadows or gradients.
- Dark theme only for now. Define colors and spacing as CSS variables in one place (`styles/tokens.css`), not scattered values.
- Show confidence visually (e.g. bar or badge) instead of only a number.
- Handle empty, loading and error states on every screen.

## Rules
- All data comes from route handlers in this app. If an endpoint is missing, note it instead of faking data in the UI (use clearly marked mock data only while the API doesn't exist).
- Keep components small. Explain any non-obvious pattern in a short comment or in your reply.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
