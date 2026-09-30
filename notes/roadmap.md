# Roadmap

## Version 1: see your Jev decisions (current)
Everything on the landing page today. JevDB is a record of what Jev decided.
- SDK sends a copy of every request + response to JevDB (non-blocking)
- Dashboard to browse and search decisions
- Grading: tag a past decision good/bad from a real outcome
- Hosted + self-hostable

## Version 2: a self-improving network
JevDB stops being only a record and starts making future decisions better, using the grades from v1.
A lot of ground to cover; treat each part as its own project.

### 2a. Score-based retrieval (RAG)
Bring the best-graded past examples into new requests.
- Pick examples by their grades/scores (well-graded, correct decisions first), per question.
- Cached in the SDK so it never adds a network hop to the Jev call. Design: `notes/retrieval.md`.
- Evidence so far: TypeSafe's docs show examples that *match real inputs* can raise confidence sharply, and unrelated ones do nothing (see retrieval.md).

### 2b. A/B testing
Prove what actually helps instead of guessing. Far-vision notes (Langfuse comparison, bandits, pitfalls): `notes/ab-testing.md`.
- **Retrieval on vs off:** split traffic, compare grades between the two groups. This is how we find out if 2a works at all.
- **Question versions:** run two wordings/criteria of the same question side by side and compare their grades. The schema already versions questions (`question_versions` in db-schema.md), so each answer knows which version produced it.
- Needs: a way to assign each call to a variant (in the SDK), and a dashboard view comparing grade rates + confidence per variant.
- Open: how many graded calls are needed before a difference is real (sample size / significance).

## Version 3: beyond Jev, beyond text
- **Other AI models:** support more decision models than Jev (e.g. future System One-style models from other labs), with the same log → grade → improve loop. The SDK and schema already store the model per call.
- **Images:** accept image state once Jev (or another model) supports it. Jev is text-only today (see TypeSafe's State docs). Needs image storage, image previews in the dashboard, and images in retrieval examples.
