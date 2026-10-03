// Content for /docs/sdk/python and /docs/sdk/js. Both pages render the SAME sections with the
// SAME wording (see SdkLangDocs.tsx); only the code and identifier names differ. Keep them
// mirrored: same question keys, same example state, same order.

export type Lang = "python" | "js";
export type Variant = "async" | "sync" | "ts" | "js";

// Identifier names used inside the shared wording, per language.
export const NAMES = {
  python: {
    client: "AsyncDecideDB",
    call: "system_one",
    idOf: "id_of",
    flush: "flush()",
    groupId: "group_id",
    userId: "user_id",
    decisionId: "decision_id",
    onError: "on_error",
    clientFile: "app/decidedb_client.py",
    pkg: "decidedb",
  },
  js: {
    client: "DecideDB",
    call: "systemOne",
    idOf: "idOf",
    flush: "await flush()",
    groupId: "groupId",
    userId: "userId",
    decisionId: "decisionId",
    onError: "onError",
    clientFile: "src/lib/decidedb.ts",
    pkg: "@decidedb/sdk",
  },
} as const;

export type Section = { id: string; label: string };

export const SECTIONS: Section[] = [
  { id: "install", label: "Install" },
  { id: "env", label: "Environment variables" },
  { id: "quickstart", label: "Quickstart" },
  { id: "client-file", label: "Set it up once" },
  { id: "per-call", label: "Per-call options" },
  { id: "ids", label: "Request IDs + grading" },
  { id: "errors", label: "Errors, flush() and shutdown" },
  { id: "logged", label: "What gets logged" },
];

type Code = { file: string; code: string };
type CodeFor = (v: Variant) => Code;

const STATE = `I was charged twice. Please fix this ASAP.`;

// ── Python ──────────────────────────────────────────────────────────

const PY_Q = `{
    "billing": Noul(instructions="Is this ticket about billing?"),
    "tone": Choice(
        instructions="What is the customer's tone?",
        criteria={"calm": None, "frustrated": None, "angry": None},
    ),
    "urgency": Score(
        instructions="How urgent is this ticket?",
        criteria=["can wait", "this week", "today"],
    ),
}`;

const indent = (s: string, n: number) => s.replace(/\n/g, "\n" + " ".repeat(n));
const isSync = (v: Variant) => v === "sync";
const aw = (v: Variant) => (isSync(v) ? "" : "await ");

const PY: Record<string, CodeFor> = {
  install: () => ({ file: "terminal", code: `uv add decidedb        # or: pip install decidedb` }),
  env: () => ({
    file: ".env",
    code: `TYPESAFE_API_KEY=sk-…          # Jev, from console.typesafe.ai
DECIDEDB_API_KEY=jdb_live_…       # DecideDB, from your DecideDB console
DECIDEDB_URL=https://<decidedb-cloud-url>   # self-hosting: http://localhost:3000`,
  }),
  quickstart: (v) => ({
    file: "main.py",
    code: isSync(v)
      ? `from typesafe_sdk import Choice, Noul, Score
from decidedb import DecideDB

with DecideDB(group_id="support-bot") as decidedb:
    response = decidedb.system_one(
        state={"document": "${STATE}"},
        questions=${indent(PY_Q, 8)},
    )

print(response.nouls["billing"].noul)
print(response.choices["tone"].choice)
print(response.scores["urgency"].score)`
      : `import asyncio

from typesafe_sdk import Choice, Noul, Score
from decidedb import AsyncDecideDB


async def main() -> None:
    async with AsyncDecideDB(group_id="support-bot") as decidedb:
        response = await decidedb.system_one(
            state={"document": "${STATE}"},
            questions=${indent(PY_Q, 12)},
        )

    print(response.nouls["billing"].noul)
    print(response.choices["tone"].choice)
    print(response.scores["urgency"].score)


asyncio.run(main())`,
  }),
  "client-file": (v) => ({
    file: "app/decidedb_client.py",
    code: `from decidedb import ${isSync(v) ? "DecideDB" : "AsyncDecideDB"}

# One client for the whole app. Keys and URL come from .env.
decidedb = ${isSync(v) ? "DecideDB" : "AsyncDecideDB"}(group_id="support-bot", tags=["prod"])`,
  }),
  "per-call": (v) => ({
    file: "app/tickets.py",
    code: `from app.decidedb_client import decidedb
from app.questions import QUESTIONS


${isSync(v) ? "def" : "async def"} triage(ticket, current_user):
    return ${aw(v)}decidedb.system_one(
        state={"document": ticket.text},
        questions=QUESTIONS,
        user_id=current_user.id,        # changes every call
        tags=["prod", "beta-form"],     # replaces the client's tags for this call
    )`,
  }),
  ids: (v) => ({
    file: "app/tickets.py",
    code: `response = ${aw(v)}decidedb.system_one(state=..., questions=QUESTIONS)
decision_id = decidedb.id_of(response)     # a UUID made by the SDK

# Or use your own id, so grading later is just a lookup:
${aw(v)}decidedb.system_one(state=..., questions=QUESTIONS, decision_id=ticket.id)`,
  }),
  errors: (v) => ({
    file: "app/tickets.py",
    code: `from typesafe_sdk import TypeSafeAPIError

try:
    response = ${aw(v)}decidedb.system_one(state=..., questions=QUESTIONS)
except TypeSafeAPIError as err:   # logged to DecideDB, then re-raised
    print(err.status, err.body)

# On shutdown (the with-block does this for you):
${isSync(v) ? "decidedb.close()" : "await decidedb.aclose()"}`,
  }),
};

// ── JS / TS ─────────────────────────────────────────────────────────

const JS_Q = `{
  billing: noul("Is this ticket about billing?"),
  tone: choice("What is the customer's tone?", { calm: null, frustrated: null, angry: null }),
  urgency: score("How urgent is this ticket?", ["can wait", "this week", "today"]),
}`;

const ext = (v: Variant) => (v === "js" ? "js" : "ts");
const isTs = (v: Variant) => v === "ts";

const JS: Record<string, CodeFor> = {
  install: () => ({ file: "terminal", code: `bun add @decidedb/sdk   # or: npm install @decidedb/sdk` }),
  env: PY.env!,
  quickstart: (v) => ({
    file: `main.${ext(v)}`,
    code: `import { DecideDB, choice, noul, score } from "@decidedb/sdk";

const decidedb = new DecideDB({ groupId: "support-bot" });

const response = await decidedb.systemOne({
  state: { document: "${STATE}" },
  questions: ${indent(JS_Q, 2)},
});

console.log(response.answers.billing.noul);
console.log(response.answers.tone.choice);
console.log(response.answers.urgency.score);

await decidedb.flush();`,
  }),
  "client-file": (v) => ({
    file: `src/lib/decidedb.${ext(v)}`,
    code: `import { DecideDB } from "@decidedb/sdk";

// One client for the whole app. Keys and URL come from .env.
export const decidedb = new DecideDB({ groupId: "support-bot", tags: ["prod"] });`,
  }),
  "per-call": (v) => ({
    file: `src/tickets.${ext(v)}`,
    code: `import { decidedb } from "./lib/decidedb";
import { QUESTIONS } from "./questions";
${isTs(v) ? `import type { Ticket, User } from "./types";\n` : ""}
export async function triage(${isTs(v) ? "ticket: Ticket, currentUser: User" : "ticket, currentUser"}) {
  return decidedb.systemOne(
    { state: { document: ticket.text }, questions: QUESTIONS },
    {
      userId: currentUser.id,         // changes every call
      tags: ["prod", "beta-form"],    // replaces the client's tags for this call
    },
  );
}`,
  }),
  ids: (v) => ({
    file: `src/tickets.${ext(v)}`,
    code: `const response = await decidedb.systemOne({ state, questions: QUESTIONS });
const decisionId${isTs(v) ? ": string | undefined" : ""} = decidedb.idOf(response);   // a UUID made by the SDK

// Or use your own id, so grading later is just a lookup:
await decidedb.systemOne({ state, questions: QUESTIONS }, { decisionId: ticket.id });`,
  }),
  errors: (v) => ({
    file: `src/tickets.${ext(v)}`,
    code: `import { APIError } from "@typesafe-ai/sdk";

try {
  const response = await decidedb.systemOne({ state, questions: QUESTIONS });
} catch (err${isTs(v) ? ": unknown" : ""}) {   // logged to DecideDB, then re-thrown
  if (err instanceof APIError) console.log(err.status, err.body);
}

// On shutdown (scripts, serverless, SIGTERM):
await decidedb.flush();`,
  }),
};

const RECORD = `{
  "id": "0192c0b8-…",            // the decision id
  "started_at": "2026-09-27T14:02:11Z",
  "latency_ms": 184.2,
  "status": 200,                 // Jev's HTTP status
  "error": null,                 // set when the Jev call failed
  "user_id": "user_482",
  "group_id": "support-bot",
  "tags": ["prod"],
  "request": { … },              // the exact body sent to Jev
  "response": { … },             // the exact body Jev returned
  "sdk": "…"
}`;

export function codeFor(lang: Lang, section: string, v: Variant): Code | null {
  if (section === "logged") return { file: "record.json", code: RECORD };
  const fn = (lang === "python" ? PY : JS)[section];
  return fn ? fn(v) : null;
}
