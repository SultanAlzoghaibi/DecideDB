# JevDB

> The "Supabase for Jev" — a drop-in Postgres backend + web UI that vibecoders can point their Jev calls at instantly, without hand-rolling their own logging setup.

## Why

- Jev has zero built-in memory or request history — every call is stateless and disappears the moment it returns.
- A vibecoder building fast doesn't want to design a Postgres schema, write a logging proxy, and build a review UI from scratch before they can even see what their AI decisions are doing.
- Same reason people reach for Supabase instead of standing up their own Postgres + auth + dashboard: the underlying tech (Postgres) is not hard, but nobody wants to assemble the boring plumbing themselves when it's already sitting there ready to `docker run`.
- Postgres is cheap and well-understood — no exotic infra, no per-seat SaaS logging bill, self-hostable for basically free. That matters to someone prototyping fast who doesn't want to burn budget on observability tooling.

## Features

1. **Instant logging** — every request/response (state, questions, answers, confidence) is captured automatically, so you can build and actually see what Jev is doing without setting anything up.
2. **Web UI** — browse and search past decisions in a table view, no raw SQL needed.
3. **Outcome grading** — a simple API call to tag a past decision as good/bad based on a real outcome (a win, a resolved ticket), not manual review.

## Experimental: retrieval (not the pitch)

A Jev-filtered retrieval feature that pulls the best-graded past examples and injects them into new requests' `state`, aiming to nudge future accuracy.

This is **explicitly unproven**. TypeSafe's own docs warn that `state` is steerable by design, and general few-shot research shows this can help, hurt, or do nothing. Ship it as an optional, clearly-labeled experimental toggle — never the headline feature.

## Notes for AI assistants

- Core value = logging + UI + grading. Prioritize these over the retrieval feature.
- Keep setup friction near zero: a single `docker run` should be enough to get started.
- Storage is Postgres. Avoid adding exotic infra or paid dependencies.
- Retrieval must stay opt-in and default off.
