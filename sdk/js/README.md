# @jevdb/sdk (JavaScript / TypeScript)

Logs each Jev call to JevDB in the background. Zero dependencies.

```ts
import { JevDB } from "@jevdb/sdk";

const jevdb = new JevDB(); // reads JEVDB_API_KEY and JEVDB_URL

const request = { model: "jev-latest", state: "...", questions: { /* ... */ } };
const started = performance.now();
const res = await fetch("https://api.typesafe.ai/v1/systemone", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify(request),
});
const response = await res.json();

jevdb.log({ request, response, statusCode: res.status, latencyMs: performance.now() - started });

// Serverless / scripts only: wait for logs before exiting.
await jevdb.flush();
```

Build: `bun install && bun run build`
