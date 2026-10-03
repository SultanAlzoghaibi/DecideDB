# decisiondb (Python)

Call Jev through DecisionDB's client and every decision is copied to DecisionDB in the background,
labeled with who made it. Sync and async. Wraps TypeSafe's official `typesafe-sdk`, so you keep
the same `Noul` / `Choice` / `Score` API.

```bash
pip install decisiondb        # or: uv add decisiondb
```

Environment (or pass them as arguments):

| Variable | What |
|---|---|
| `TYPESAFE_API_KEY` | Your Jev key. Only ever sent to Jev. |
| `DECISIONDB_API_KEY` | Your DecisionDB key. Only ever sent to DecisionDB. |
| `DECISIONDB_URL` | Where DecisionDB runs (default `http://localhost:3000`). |

### Where do the keys come from?

Same rule as TypeSafe's SDK: **an argument wins, otherwise the environment variable is used.**
`DecisionDB(jev_api_key="sk-…")` beats `TYPESAFE_API_KEY`, and `DecisionDB(api_key="jdb_…")` beats `DECISIONDB_API_KEY`.
Environment variables (in a gitignored `.env`) keep keys out of your code.

## Sync

```python
from typesafe_sdk import Choice, Noul
from decisiondb import DecisionDB

with DecisionDB(user_id="user_482", group_id="support-bot", tags=["prod"]) as decisiondb:
    response = decisiondb.system_one(
        state="I was charged twice. Please fix this ASAP.",
        questions={
            "billing": Noul(instructions="Is this ticket about billing?"),
            "tone": Choice(instructions="What is the customer's tone?",
                           criteria={"calm": None, "frustrated": None, "angry": None}),
        },
    )
    print(response.choices["tone"].choice)
    decision_id = decisiondb.id_of(response)   # keep it to grade this decision later
# leaving the block sends any pending logs
```

## Async

```python
from decisiondb import AsyncDecisionDB

async with AsyncDecisionDB(group_id="support-bot") as decisiondb:
    response = await decisiondb.system_one(state=..., questions=...)
```

## Options

- **`system_one(...)`** takes exactly TypeSafe's arguments (`state`, `questions`, `model`, `retry`, `timeout`, …), plus optional per-call `user_id`, `group_id`, `tags` and `decision_id` (your own id, e.g. a ticket id).
- **Defaults** set on `DecisionDB(...)` apply to every call; per-call values override them.
- **Bring your own client:** `DecisionDB(jev_client=TypeSafeClient(...))`. DecisionDB won't close a client you passed in.
- **Never breaks your app:** logs are sent from a background thread. If DecisionDB is down, the log is dropped with a warning (or your `on_error`), and your Jev call is unaffected. If Jev fails, the failure is logged and the original exception is re-raised.

## What gets sent to DecisionDB

```jsonc
{
  "id": "…",                 // decision id (decisiondb.id_of(response))
  "started_at": "…",         // when the Jev call started (UTC)
  "latency_ms": 184.2,
  "status": 200,             // Jev's HTTP status
  "error": null,             // set when Jev failed
  "user_id": "user_482", "group_id": "support-bot", "tags": ["prod"],
  "request": { … },          // the exact body sent to Jev
  "response": { … },         // the exact body Jev returned
  "sdk": "decisiondb-python/0.2.0"
}
```
The DecisionDB key goes in the `Authorization` header; no keys are ever in the body.
