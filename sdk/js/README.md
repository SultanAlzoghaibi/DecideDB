# @decidedb/sdk (JavaScript / TypeScript)

Call Jev through DecideDB's client and every decision is copied to DecideDB in the background,
labeled with who made it. Wraps TypeSafe's official `@typesafe-ai/sdk`, so you keep its typed
`noul` / `choice` / `score` helpers and inferred answer types.

```bash
bun add @decidedb/sdk        # or: npm install @decidedb/sdk
```

Keys follow TypeSafe's rule: **an option wins, otherwise the environment variable is used.**

| Variable | Option | What |
|---|---|---|
| `TYPESAFE_API_KEY` | `jevApiKey` | Your Jev key. Only ever sent to Jev. |
| `DECIDEDB_API_KEY` | `apiKey` | Your DecideDB key. Only ever sent to DecideDB. |
| `DECIDEDB_URL` | `baseUrl` | Where DecideDB runs (default `http://localhost:3000`). |

```ts
import { DecideDB, choice, noul } from "@decidedb/sdk";

const decidedb = new DecideDB({ groupId: "support-bot", tags: ["prod"], model: "jev-1.13.0" });

const response = await decidedb.systemOne(
  {
    state: { document: "I was charged twice. Please fix this ASAP." },
    questions: {
      billing: noul("Is this ticket about billing?"),
      tone: choice("What is the customer's tone?", { calm: null, frustrated: null, angry: null }),
    },
  },
  { userId: "user_482" }, // per-call: userId, groupId, tags, decisionId (+ TypeSafe's timeout, retry, signal)
);

console.log(response.answers.tone.choice);
const decisionId = decidedb.idOf(response); // keep it to grade this decision later

await decidedb.flush(); // scripts / serverless: wait for pending logs before exiting
```

- **Never breaks your app:** logs are sent in the background. If DecideDB is down, the log is dropped with a warning (or your `onError`). If Jev fails, the failure is logged and the original error is re-thrown.
- **Bring your own client:** `new DecideDB({ jevClient: new TypeSafeClient({...}) })`.
- The record sent to DecideDB has the same shape as the Python SDK's (see `sdk/python/README.md`).

Build: `bun install && bun run build`
