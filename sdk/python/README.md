# decidedb (Python)

Call Jev through DecideDB's client and every decision is copied to DecideDB in the background,
labeled with who made it. Sync and async. Wraps TypeSafe's official `typesafe-sdk`, so you keep
the same `Noul` / `Choice` / `Score` API.

```bash
pip install decidedb        # or: uv add decidedb
```

Environment (or pass them as arguments):

| Variable | What |
|---|---|
| `TYPESAFE_API_KEY` | Your Jev key. Only ever sent to Jev. |
| `DECIDEDB_API_KEY` | Your DecideDB key. Only ever sent to DecideDB. |
| `DECIDEDB_URL` | Where DecideDB runs (default `http://localhost:3000`). |

### Where do the keys come from?

Same rule as TypeSafe's SDK: **an argument wins, otherwise the environment variable is used.**
`DecideDB(jev_api_key="sk-…")` beats `TYPESAFE_API_KEY`, and `DecideDB(api_key="jdb_…")` beats `DECIDEDB_API_KEY`.
Environment variables (in a gitignored `.env`) keep keys out of your code.

## Sync

```python
from typesafe_sdk import Choice, Noul
from decidedb import DecideDB

with DecideDB(user_id="user_482", group_id="support-bot", tags=["prod"]) as decidedb:
    response = decidedb.system_one(
        state="I was charged twice. Please fix this ASAP.",
        questions={
            "billing": Noul(instructions="Is this ticket about billing?"),
            "tone": Choice(instructions="What is the customer's tone?",
                           criteria={"calm": None, "frustrated": None, "angry": None}),
        },
    )
    print(response.choices["tone"].choice)
    decision_id = decidedb.id_of(response)   # keep it to grade this decision later
# leaving the block sends any pending logs
```

## Async

```python
from decidedb import AsyncDecideDB

async with AsyncDecideDB(group_id="support-bot") as decidedb:
    response = await decidedb.system_one(state=..., questions=...)
```

## Options

- **`system_one(...)`** takes exactly TypeSafe's arguments (`state`, `questions`, `model`, `retry`, `timeout`, …), plus optional per-call `user_id`, `group_id`, `tags` and `decision_id` (your own id, e.g. a ticket id).
- **Defaults** set on `DecideDB(...)` apply to every call; per-call values override them.
- **Bring your own client:** `DecideDB(jev_client=TypeSafeClient(...))`. DecideDB won't close a client you passed in.
- **Never breaks your app:** logs are sent from a background thread. If DecideDB is down, the log is dropped with a warning (or your `on_error`), and your Jev call is unaffected. If Jev fails, the failure is logged and the original exception is re-raised.

## What gets sent to DecideDB

```jsonc
{
  "id": "…",                 // decision id (decidedb.id_of(response))
  "started_at": "…",         // when the Jev call started (UTC)
  "latency_ms": 184.2,
  "status": 200,             // Jev's HTTP status
  "error": null,             // set when Jev failed
  "user_id": "user_482", "group_id": "support-bot", "tags": ["prod"],
  "request": { … },          // the exact body sent to Jev
  "response": { … },         // the exact body Jev returned
  "sdk": "decidedb-python/0.2.0"
}
```
The DecideDB key goes in the `Authorization` header; no keys are ever in the body.
