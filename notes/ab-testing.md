# A/B Testing — Far Vision

> Status: **future idea, not planned work.** Depends on the experimental retrieval feature existing first. Core (logging + UI + grading) comes before any of this.

## The idea

Let two (or more) RAG/retrieval setups compete on live traffic. Real outcomes decide the winner, and traffic shifts toward the better one over time.

The first matchup is obvious: **retrieval off vs retrieval on.** The README calls retrieval "explicitly unproven". A/B testing is how we prove (or kill) it.

## How people do it today (Langfuse / LangSmith)

**Offline (dataset experiments)**
1. Build a dataset of questions with expected answers or sources.
2. Run variant A over it, then variant B.
3. Score both, usually with an LLM judge or RAGAS (context precision, faithfulness, answer correctness).
4. Compare the runs side by side and pick a winner by hand.

Cheap and safe, but only tests the cases you thought of.

**Online (live traffic)**
1. App code picks a variant at random.
2. Tag the trace with the variant (`tags=["rag_b"]`, `metadata={"variant": ...}`).
3. Attach scores later (thumbs up/down, LLM judge).
4. Filter the dashboard by tag and compare average score, cost and latency.

Langfuse prompt labels (`prod-a` / `prod-b`) handle this when only the prompt differs.

**Common things to vary:** chunk size and overlap, embedding model, top-k, adding a reranker, hybrid (keyword + vector) vs pure vector search, prompt wording.

## Gaps in existing tools (JevDB's opening)

| Gap | Langfuse today | JevDB could |
|---|---|---|
| Traffic split | You write it | Built in: assign the variant on each logged request |
| Auto-shift to winner | None | Bandit (Thompson sampling) shifts traffic automatically |
| Real-outcome signal | Mostly LLM judge or thumbs | Outcome grading already exists (win, resolved ticket) |
| Statistical confidence | Just averages | Show confidence intervals and a "not enough data yet" state |

## Rough shape

1. **`variant` column** on logged requests (`off`, `retrieval_v1`, ...).
2. **Random split** with configurable weights (e.g. 90/10 to start a new variant safely).
3. **UI view**: win rate per variant, sample count, confidence interval.
4. **Bandit mode (later)**: traffic weights update from grades automatically. Good candidate for a hosted-only convenience, but it must never make hosted slower than self-host.

## Local check vs skip it

- **Offline first:** safe, fast, but tests guesses about "good".
- **Skip to online:** tests against real outcomes, which is the stronger signal. The risk is that a bad variant hurts real users.
- **Guardrails if skipping:** small initial traffic share, bandit backs off losers, and a minimum sample size before declaring a winner.

## Watch out

- **Feedback loop:** retrieval injects the best-graded examples, and those grades were partly shaped by retrieval. The winner can reinforce itself. Keep a small permanent `off` control group as a baseline.
- **Slow signal:** real outcomes can take days. Low-volume users may never reach significance, so say so in the UI instead of showing a fake winner.
- **Noise:** early results swing wildly. Don't let the bandit go all-in too early.
- **Opt-in only:** same rule as retrieval. Default off, clearly labeled experimental.
