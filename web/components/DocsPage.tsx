"use client";

import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { CodeBlock } from "./CodeBlock";
import { CodeTabs } from "./CodeTabs";
import { DocTable, DocsNav, useActiveSection } from "./docsShared";

// Mock docs: they describe JevDB as designed, before the service exists.
// Cloud first; self-hosting is the alternative.

// Hosted URL isn't decided yet; change it here once it is.
const CLOUD_URL = "https://<jevdb-cloud-url>";
const GIT_PY = "jevdb @ git+https://github.com/SultanAlzoghaibi/JevDB#subdirectory=sdk/python";

const SECTIONS = [
  { id: "introduction", label: "Introduction" },
  { id: "quickstart", label: "Quickstart (Cloud)" },
  { id: "project-layout", label: "Where it goes in your project" },
  { id: "logging", label: "What gets logged" },
  { id: "question-types", label: "Question types" },
  { id: "grading", label: "Grading" },
  { id: "dashboard", label: "Dashboard" },
  { id: "self-host", label: "Self-host (alternative)" },
  { id: "configuration", label: "Configuration" },
  { id: "retrieval", label: "Retrieval" },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

export function DocsPage() {
  const active = useActiveSection(SECTION_IDS);

  return (
    <>
      <Nav active="docs" />
      <div className="container docs">
        <aside className="docs__sidebar">
          <DocsNav current="/docs" />
          <p className="docs__group">On this page</p>
          <nav>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`docs__link${active === s.id ? " docs__link--active" : ""}`}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="docs__content">
          <div className="notice">
            <span className="tag tag--warn">Draft</span>
            <p>
              These docs describe JevDB as designed. It isn&apos;t released yet, so names, URLs and
              endpoints may change.
            </p>
          </div>

          <Introduction />
          <Quickstart />
          <ProjectLayout />
          <Logging />
          <QuestionTypes />
          <Grading />
          <Dashboard />
          <SelfHost />
          <Configuration />
          <Retrieval />
        </article>
      </div>
      <Footer />
    </>
  );
}

function Introduction() {
  return (
    <section id="introduction" className="doc">
      <h1>Introduction</h1>
      <p>
        The Jev API is stateless: every call returns an answer and then it&apos;s gone. JevDB keeps a
        record of everything. Your app still calls Jev itself; the JevDB SDK copies each request and
        response to JevDB in the background, so it never slows your app down.
      </p>
      <ul>
        <li><strong>Log</strong>: every request and response is saved automatically.</li>
        <li><strong>Browse</strong>: a web dashboard lets you search past decisions without SQL.</li>
        <li><strong>Grade</strong>: tag a past decision good or bad once you know the real outcome.</li>
      </ul>
      <p>
        The fastest way to start is <strong>JevDB Cloud</strong>: nothing to run. Prefer to keep
        everything on your own servers? See <a href="#self-host">Self-host</a>.
      </p>
    </section>
  );
}

function Quickstart() {
  return (
    <section id="quickstart" className="doc">
      <h2>Quickstart (Cloud)</h2>
      <p>
        1. <a href="/login">Sign up</a> and create an API key in the console. It starts with{" "}
        <code>jdb_live_</code>.
      </p>
      <p>2. Install the SDK:</p>
      <CodeTabs
        tabs={[
          { id: "uv", label: "Python (uv)", file: "terminal", code: "uv add jevdb" },
          { id: "pip", label: "Python (pip)", file: "terminal", code: "pip install jevdb" },
          { id: "bun", label: "JS (bun)", file: "terminal", code: "bun add @jevdb/sdk" },
          { id: "npm", label: "JS (npm)", file: "terminal", code: "npm install @jevdb/sdk" },
        ]}
      />
      <p className="doc__note">
        Not on PyPI / npm yet. Until then, install straight from GitHub:{" "}
        <code>uv add &quot;{GIT_PY}&quot;</code>
      </p>
      <p>3. Set your keys and point the SDK at JevDB Cloud:</p>
      <CodeBlock
        label=".env"
        code={`
TYPESAFE_API_KEY=sk-…          # Jev, from console.typesafe.ai
JEVDB_API_KEY=jdb_live_…       # JevDB, from your JevDB console
JEVDB_URL=${CLOUD_URL}
`}
      />
      <p>
        4. Call Jev through the JevDB client, then open the <a href="/console">console</a> to see
        the decision. Full examples: <a href="/docs/sdk">Client SDK</a>.
      </p>
    </section>
  );
}

// One small module creates the client; the rest of the app imports it.
const TREE_PY = `
my-app/
├── .env                  # TYPESAFE_API_KEY, JEVDB_API_KEY, JEVDB_URL
├── pyproject.toml        # dependency: jevdb
└── app/
    ├── main.py           # your server / entry point
    ├── jevdb_client.py   # ← create JevDB(...) once here
    └── tickets.py        # from app.jevdb_client import jevdb
                          #   jevdb.system_one(state=…, questions=…)
`;

const TREE_JS = `
my-app/
├── .env                  # TYPESAFE_API_KEY, JEVDB_API_KEY, JEVDB_URL
├── package.json          # dependency: @jevdb/sdk
└── src/
    ├── index.ts          # your server / entry point
    ├── lib/
    │   └── jevdb.ts      # ← export const jevdb = new JevDB({...})
    └── tickets.ts        # import { jevdb } from "./lib/jevdb"
                          #   await jevdb.systemOne({ state, questions })
`;

const CLIENT_PY = `
from jevdb import JevDB

# Keys and URL come from .env. One client for the whole app.
jevdb = JevDB(group_id="support-bot", tags=["prod"])
`;

const CLIENT_JS = `
import { JevDB } from "@jevdb/sdk";

// Keys and URL come from .env. One client for the whole app.
export const jevdb = new JevDB({ groupId: "support-bot", tags: ["prod"] });
`;

function ProjectLayout() {
  return (
    <section id="project-layout" className="doc">
      <h2>Where it goes in your project</h2>
      <p>
        Create the client once in its own small file and import it wherever you call Jev. That way
        keys, <code>group_id</code> and tags live in one place.
      </p>
      <CodeTabs
        tabs={[
          { id: "py", label: "Python", file: "project tree", code: TREE_PY },
          { id: "js", label: "JavaScript", file: "project tree", code: TREE_JS },
        ]}
      />
      <CodeTabs
        tabs={[
          { id: "py", label: "Python", file: "app/jevdb_client.py", code: CLIENT_PY },
          { id: "js", label: "JavaScript", file: "src/lib/jevdb.ts", code: CLIENT_JS },
        ]}
      />
    </section>
  );
}

function Logging() {
  return (
    <section id="logging" className="doc">
      <h2>What gets logged</h2>
      <p>
        Each call becomes one row per question. Fields you filter on get their own columns; the
        full request and response are kept as JSONB so nothing is lost.
      </p>
      <DocTable
        head={["Column", "Type", "Notes"]}
        rows={[
          ["id", "text", "Decision id: jevdb.id_of(response)"],
          ["created_at", "timestamptz", "When the call started"],
          ["question_type", "text", "noul, choice or score"],
          ["answer", "text", "The typed answer, as text"],
          ["confidence", "real", "0 to 1"],
          ["latency_ms", "integer", "Jev round trip time"],
          ["grade", "text", "good, bad or null"],
          ["payload", "jsonb", "Full request and response"],
        ]}
      />
      <p>
        Writes happen in the background after the response is sent, so logging never slows your
        app down. The trade-off: if your process is killed before <code>flush()</code>, the last
        few queued logs can be lost.
      </p>
    </section>
  );
}

function QuestionTypes() {
  return (
    <section id="question-types" className="doc">
      <h2>Question types</h2>
      <p>Jev supports three question types. JevDB stores each one the same way, so they're all searchable.</p>
      <DocTable
        head={["Type", "Answers", "Stored answer"]}
        rows={[
          ["Noul", "Yes or no", "yes / no"],
          ["Choice", "One option, with the full probability breakdown", "The chosen option (breakdown in payload)"],
          ["Score", "A number on a scale", "The number, e.g. 7.2"],
        ]}
      />
    </section>
  );
}

function Grading() {
  return (
    <section id="grading" className="doc">
      <h2>Grading</h2>
      <p>
        When the real outcome is known, send a grade for the request. You can grade minutes or
        weeks later, and grading again replaces the previous grade.
      </p>
      <CodeBlock
        label="terminal"
        code={`
curl -X POST ${CLOUD_URL}/api/decisions/<decision-id>/grade \\
  -H "Authorization: Bearer $JEVDB_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "grade": "good", "note": "customer accepted the refund" }'
`}
      />
      <DocTable
        head={["Field", "Required", "Notes"]}
        rows={[
          ["grade", "yes", '"good" or "bad"'],
          ["note", "no", "Free text, shown in the dashboard"],
        ]}
      />
    </section>
  );
}

function Dashboard() {
  return (
    <section id="dashboard" className="doc">
      <h2>Dashboard</h2>
      <p>
        Open the <a href="/console">console</a> (or <code>http://localhost:3000/console</code> when
        self-hosting) to see every decision in a table, newest first.
      </p>
      <ul>
        <li>Search by text in the state or answer</li>
        <li>Filter by question type and by graded, ungraded, good or bad</li>
        <li>Click a row to see the full state, every answer and the raw JSON</li>
        <li>Grade a decision directly from its detail view</li>
      </ul>
    </section>
  );
}

function SelfHost() {
  return (
    <section id="self-host" className="doc">
      <h2>Self-host (alternative)</h2>
      <p>
        Want your data on your own machines? Run JevDB yourself. You need Docker; Postgres runs in
        a container.
      </p>
      <CodeBlock
        label="terminal"
        code={`
git clone https://github.com/SultanAlzoghaibi/JevDB.git jevdb
cd jevdb
docker compose up -d        # Postgres
cd web && bun install && bun run db:migrate && bun run dev
`}
      />
      <p>
        Then point the SDK at your instance with <code>JEVDB_URL=http://localhost:3000</code> (the
        SDK default). Everything else in these docs works the same.
      </p>
    </section>
  );
}

function Configuration() {
  return (
    <section id="configuration" className="doc">
      <h2>Configuration</h2>
      <p>
        Self-hosting only. JevDB Cloud is configured for you. Set these in{" "}
        <code>web/.env.local</code>.
      </p>
      <DocTable
        head={["Variable", "Default", "Description"]}
        rows={[
          ["DATABASE_URL", "(compose Postgres)", "Postgres connection string"],
          ["BETTER_AUTH_URL", "http://localhost:3000", "Where the dashboard is served"],
          ["JEVDB_RETENTION_DAYS", "30", "Delete logs older than this; 0 keeps forever"],
          ["JEVDB_RETRIEVAL", "off", "Experimental retrieval, see below"],
        ]}
      />
    </section>
  );
}

function Retrieval() {
  return (
    <section id="retrieval" className="doc">
      <h2>
        Retrieval <span className="tag tag--warn">Experimental</span>
      </h2>
      <p>
        When enabled, JevDB picks relevant graded examples from your history and adds them to a
        new request's <code>state</code> as few-shot context, aiming to improve accuracy.
      </p>
      <p>
        This is unproven. Injected examples can help, hurt, or do nothing, so it's off by default.
        When it's on, the original state and the injected context are logged separately, so you
        can compare results with and without it.
      </p>
      <p>
        Full guide, walkthrough and options: <a href="/docs/rag">Retrieval (RAG)</a>.
      </p>
    </section>
  );
}
