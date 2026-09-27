# jevdb (Python)

Logs each Jev call to JevDB in the background. Standard library only, no dependencies.

```python
import time
from jevdb import JevDB
from typesafe_sdk import TypeSafeClient, Noul

jevdb = JevDB()  # reads JEVDB_API_KEY and JEVDB_URL

request = {"state": "I was charged twice.", "questions": {"billing": {"type": "noul", "instructions": "Is this about billing?"}}}
started = time.perf_counter()
with TypeSafeClient() as client:
    response = client.system_one(
        state=request["state"],
        questions={"billing": Noul(instructions="Is this about billing?")},
    )

raw = response.raw_http_response  # the exact HTTP response from Jev
jevdb.log(
    request=request,
    response=raw.json(),
    status_code=raw.status_code,
    latency_ms=(time.perf_counter() - started) * 1000,
)
# Pending logs are flushed automatically when the program exits.
```
