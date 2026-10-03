# Retrieval design (experimental, not built yet)

Status: design only. Retrieval is step 5 in the build order and stays opt-in, default OFF.

## The problem
Retrieval injects past graded examples into a request's `state` before it goes to Jev.
So the examples must be ready *before* the Jev call. A naive version puts DecideDB on the hot path:

```
your code → SDK → DecideDB (find examples) → Jev → back
                  └── extra network round trip + query on every call
```

- **Latency:** +20–100ms+ per call depending on where the app runs.
- **Availability:** if DecideDB is down, Jev calls stall.
- **Business:** hosted would be slower than self-hosted, which pushes users to self-host. Hosted is the money path, so that must not happen.

## Decision: cache examples in the SDK
```
hot path:    your code → SDK [in-memory example cache] → Jev
background:  SDK ⇄ DecideDB   refresh cache (~60s)
```

- **Cache key:** question version hash (key + type + instructions + criteria, see `question_versions` in db-schema.md).
- **Cache value:** a small example set per question, e.g. top ~20 graded examples; inject ~3 per call.
- **Why it's safe:** grades arrive minutes to weeks after a decision, so the pool changes slowly. 60s stale is fine.
- **Stale-while-revalidate:** after the TTL, keep serving the cached set and refresh in the background.
- **Cheap refresh:** ETag / version per example set; unchanged → `304 Not Modified`.
- **Never block, even on a miss:** empty cache or DecideDB down → call Jev with no examples, fill the cache in the background. "No examples" is a valid result, so unlike Langfuse we don't wait on the first fetch.
- **Serverless:** fresh instances start with an empty cache. Offer `decidedb.prefetch([...questionKeys])` and/or wait at most ~50ms on first use.

## Server side
- Precompute each question's example set when a grade is added; store it in a Postgres table and serve with an ETag.
- No Redis until Postgres is actually the bottleneck (no exotic infra).

## Open questions
- **Relevance:** the README idea "Jev judges which examples are relevant" means a second Jev call per request (2x latency and cost) that no cache can hide. Start with per-question selection (no per-call matching). Later: cheap lexical similarity inside the SDK over the cached pool (still no network).
- **Token cost:** injected examples add Jev input tokens. Keep K small.
- **SDK shape:** injection needs the SDK to wrap the Jev call (`decidedb.systemOne({ state, questions })`), not just `log()` afterwards. Matches the landing-page diagram.
- Log the original state and the injected context separately, so results with/without retrieval can be compared.

## Evidence from TypeSafe's docs (2026-09-26)
Source: https://docs.typesafe.ai/llms-full.txt (Choice + Score pages, "How to build", jev-1.13 jaggedness)
- **Examples are officially supported, in the criteria.** Choice options and Score levels can be objects with `what`, `not_for` and an `examples` array. TypeSafe recommends this when the model keeps confusing two options. So retrieved examples could go into the matching option's `examples`, not only into `state`.
- **Matching examples help a lot, unrelated ones do nothing.** In their Score example (a Safari bug report): plain strings gave score 1.43 at confidence 0.35. Adding an example that matches the input gave 1.03 at confidence **0.96**. Adding an unrelated example gave 1.43 / 0.35 again, the same as having no example.
- **Their warning:** higher confidence does not prove the answer is correct. Use examples with known right answers and test on separate inputs. (This is exactly what grades + A/B testing give us.)
- **State can steer Jev** (jev-1.13 jaggedness page): text in `state` that argues for a classification can move the answer. Injected examples in `state` are that kind of steering, so they could push answers toward past labels. Another reason to measure with A/B tests.
- Implication for relevance: examples must look like the current input to help, so picking by grade alone may not be enough; similarity matters.

## Prior art: Langfuse prompt caching
Langfuse solves the same problem for prompts: https://langfuse.com/docs/prompt-management/features/caching

| Case | Langfuse SDK | Blocks the app? |
|---|---|---|
| Fresh in cache | returns immediately, no network | no |
| Past TTL (default 60s) | returns stale copy, refreshes in background | no |
| Not cached yet | fetches from API | yes, once |
| Pre-fetch (optional) | warms cache on startup | no |
| Fallback (optional) | cache empty + API down → user-supplied default | no |

Server side they use Redis in front of Postgres. Their tracing is separate: batched async sends with `flush()`, same as our `log()`.

| Langfuse | DecideDB |
|---|---|
| `getPrompt("name")` | examples for a question hash |
| 60s TTL, background refresh | same |
| blocking first fetch | **don't block**: call Jev without examples |
| pre-fetch | `decidedb.prefetch([...])` |
| fallback prompt | not needed: no examples = fallback |
| Redis → Postgres | precomputed Postgres table first, Redis later if needed |
