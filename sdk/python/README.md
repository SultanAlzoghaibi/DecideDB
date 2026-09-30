# jevdb (Python)

Call Jev through JevDB's client and every decision is copied to JevDB in the background,
labeled with who made it. Sync and async. Wraps TypeSafe's official `typesafe-sdk`, so you keep
the same `Noul` / `Choice` / `Score` API.

```bash
pip install jevdb        # or: uv add jevdb
```

Environment (or pass them as arguments):

| Variable | What |
|---|---|
| `TYPESAFE_API_KEY` | Your Jev key. Only ever sent to Jev. |
| `JEVDB_API_KEY` | Your JevDB key. Only ever sent to JevDB. |
| `JEVDB_URL` | Where JevDB runs (default `http://localhost:3000`). |

### Where do the keys come from?

Same rule as TypeSafe's SDK: **an argument wins, otherwise the environment variable is used.**
`JevDB(jev_api_key="sk-…")` beats `TYPESAFE_API_KEY`, and `JevDB(api_key="jdb_…")` beats `JEVDB_API_KEY`.
Environment variables (in a gitignored `.env`) keep keys out of your code.

## Sync

```python
from typesafe_sdk import Choice, Noul
from jevdb import JevDB

with JevDB(user_id="user_482", group_id="support-bot", tags=["prod"]) as jevdb:
    response = jevdb.system_one(
        state="I was charged twice. Please fix this ASAP.",
        questions={
            "billing": Noul(instructions="Is this ticket about billing?"),
            "tone": Choice(instructions="What is the customer's tone?",
                           criteria={"calm": None, "frustrated": None, "angry": None}),
        },
    )
    print(response.choices["tone"].choice)
    decision_id = jevdb.id_of(response)   # keep it to grade this decision later
# leaving the block sends any pending logs
```

## Async

```python
from jevdb import AsyncJevDB

async with AsyncJevDB(group_id="support-bot") as jevdb:
    response = await jevdb.system_one(state=..., questions=...)
```

## Options

- **`system_one(...)`** takes exactly TypeSafe's arguments (`state`, `questions`, `model`, `retry`, `timeout`, …), plus optional per-call `user_id`, `group_id`, `tags` and `decision_id` (your own id, e.g. a ticket id).
- **Defaults** set on `JevDB(...)` apply to every call; per-call values override them.
- **Bring your own client:** `JevDB(jev_client=TypeSafeClient(...))`. JevDB won't close a client you passed in.
- **Never breaks your app:** logs are sent from a background thread. If JevDB is down, the log is dropped with a warning (or your `on_error`), and your Jev call is unaffected. If Jev fails, the failure is logged and the original exception is re-raised.

## What gets sent to JevDB

```jsonc
{
  "id": "…",                 // decision id (jevdb.id_of(response))
  "started_at": "…",         // when the Jev call started (UTC)
  "latency_ms": 184.2,
  "status": 200,             // Jev's HTTP status
  "error": null,             // set when Jev failed
  "user_id": "user_482", "group_id": "support-bot", "tags": ["prod"],
  "request": { … },          // the exact body sent to Jev
  "response": { … },         // the exact body Jev returned
  "sdk": "jevdb-python/0.2.0"
}
```
The JevDB key goes in the `Authorization` header; no keys are ever in the body.
