import { useEffect, useState } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { CodeBlock } from "../components/CodeBlock";

// Mock docs: they describe JevDB as designed, before the Rust service exists.

const SECTIONS = [
  { id: "introduction", label: "Introduction" },
  { id: "quickstart", label: "Quickstart" },
  { id: "connect", label: "Connect your app" },
  { id: "logging", label: "What gets logged" },
  { id: "question-types", label: "Question types" },
  { id: "grading", label: "Grading" },
  { id: "dashboard", label: "Dashboard" },
  { id: "configuration", label: "Configuration" },
  { id: "retrieval", label: "Retrieval" },
];

// Highlights the sidebar link for whichever section is currently near the top of the screen.
function useActiveSection() {
  const [active, setActive] = useState(SECTIONS[0]!.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0]!.target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return active;
}

export function DocsPage() {
  const active = useActiveSection();

  return (
    <>
      <Nav active="docs" />
      <div className="container docs">
        <aside className="docs__sidebar">
          <p className="docs__group">Getting started</p>
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
              These docs describe JevDB as designed. It isn't released yet, so names, ports and
              endpoints may change.
            </p>
          </div>

          <Introduction />
          <Quickstart />
          <Connect />
          <Logging />
          <QuestionTypes />
          <Grading />
          <Dashboard />
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
        The Jev API is stateless: every call returns an answer and then it's gone. JevDB is a small
        self-hosted proxy that sits between your app and Jev and keeps a record of everything.
      </p>
      <ul>
        <li><strong>Log</strong>: every request and response is saved to Postgres automatically.</li>
        <li><strong>Browse</strong>: a web dashboard lets you search past decisions without SQL.</li>
        <li><strong>Grade</strong>: tag a past decision good or bad once you know the real outcome.</li>
      </ul>
    </section>
  );
}

function Quickstart() {
  return (
    <section id="quickstart" className="doc">
      <h2>Quickstart</h2>
      <p>You need Docker. That's it: Postgres, the proxy and the dashboard all run in containers.</p>
      <CodeBlock
        label="terminal"
        code={`
git clone <jevdb-repo-url> jevdb
cd jevdb
docker compose up
`}
      />
      <p>Once it's running:</p>
      <ul>
        <li>Proxy: <code>http://localhost:8080</code> (point your app here)</li>
        <li>Dashboard: <code>http://localhost:3000</code></li>
      </ul>
    </section>
  );
}

function Connect() {
  return (
    <section id="connect" className="doc">
      <h2>Connect your app</h2>
      <p>
        Change the base URL your app uses for Jev to the proxy. Keep sending your Jev API key as
        usual: JevDB forwards the request unchanged, whatever path you call, and returns Jev's
        response unchanged.
      </p>
      <CodeBlock
        label="app.ts"
        code={`
// Before: https://<jev-api-host>/...
// After:  http://localhost:8080/...
const res = await fetch("http://localhost:8080/v1/evaluate", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.JEV_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    state: "Customer says the order arrived damaged and wants their money back.",
    questions: [
      { type: "choice", text: "What is the intent?", options: ["refund_request", "billing", "other"] },
      { type: "noul", text: "Is the customer angry?" },
    ],
  }),
});

// JevDB adds one header so you can grade this decision later.
const requestId = res.headers.get("x-jevdb-request-id");
`}
      />
      <p className="doc__note">
        The Jev endpoint path and payload above are illustrative. JevDB doesn't depend on them; it
        forwards whatever you send.
      </p>
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
          ["id", "text", "Same value as the x-jevdb-request-id header"],
          ["created_at", "timestamptz", "When the proxy received the call"],
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
        app down. The trade-off: if the proxy crashes, the last few queued logs can be lost.
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
curl -X POST http://localhost:8080/v1/requests/req_8f2a1c/grade \\
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
        Open <code>http://localhost:3000</code> to see every request in a table, newest first.
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

function Configuration() {
  return (
    <section id="configuration" className="doc">
      <h2>Configuration</h2>
      <p>
        Everything is set with environment variables in <code>.env</code>. The defaults work
        out of the box with Docker Compose.
      </p>
      <DocTable
        head={["Variable", "Default", "Description"]}
        rows={[
          ["DATABASE_URL", "(compose Postgres)", "Postgres connection string"],
          ["JEVDB_PORT", "8080", "Port the proxy listens on"],
          ["JEVDB_UPSTREAM_URL", "(Jev API)", "Where requests are forwarded"],
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
        Interested in testing this? Open an issue with what you tried and what changed.
      </p>
    </section>
  );
}

function DocTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="doc__table">
      <table className="table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i} className={i === 0 ? "mono" : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
