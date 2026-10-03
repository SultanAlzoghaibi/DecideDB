# @decisiondb/sdk (JavaScript / TypeScript)

Call Jev through DecisionDB's client and every decision is copied to DecisionDB in the background,
labeled with who made it. Wraps TypeSafe's official `@typesafe-ai/sdk`, so you keep its typed
`noul` / `choice` / `score` helpers and inferred answer types.

```bash
bun add @decisiondb/sdk        # or: npm install @decisiondb/sdk
```

Keys follow TypeSafe's rule: **an option wins, otherwise the environment variable is used.**

| Variable | Option | What |
|---|---|---|
| `TYPESAFE_API_KEY` | `jevApiKey` | Your Jev key. Only ever sent to Jev. |
| `DECISIONDB_API_KEY` | `apiKey` | Your DecisionDB key. Only ever sent to DecisionDB. |
| `DECISIONDB_URL` | `baseUrl` | Where DecisionDB runs (default `http://localhost:3000`). |

```ts
import { DecisionDB, choice, noul } from "@decisiondb/sdk";

const decisiondb = new DecisionDB({ groupId: "support-bot", tags: ["prod"], model: "jev-1.13.0" });

const response = await decisiondb.systemOne(
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
const decisionId = decisiondb.idOf(response); // keep it to grade this decision later

await decisiondb.flush(); // scripts / serverless: wait for pending logs before exiting
```

- **Never breaks your app:** logs are sent in the background. If DecisionDB is down, the log is dropped with a warning (or your `onError`). If Jev fails, the failure is logged and the original error is re-thrown.
- **Bring your own client:** `new DecisionDB({ jevClient: new TypeSafeClient({...}) })`.
- The record sent to DecisionDB has the same shape as the Python SDK's (see `sdk/python/README.md`).

Build: `bun install && bun run build`
