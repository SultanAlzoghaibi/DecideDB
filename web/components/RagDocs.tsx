"use client";

import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { CodeTabs } from "./CodeTabs";
import { DocTable, DocsNav, useActiveSection } from "./docsShared";
import { SdkFlowRagStack } from "./SdkFlowRagCache";
import { FitWidth } from "./FitWidth";

// /docs/rag: retrieval (few-shot examples injected into `state`). Version 2 of the product,
// see notes/roadmap.md. Describes the design; nothing here is built yet.

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "walkthrough", label: "Walkthrough" },
  { id: "groups", label: "Turn it on per group" },
  { id: "automatic", label: "A · Automatic examples" },
  { id: "custom", label: "B · Custom examples" },
  { id: "ab-test", label: "A/B testing" },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

const ENABLE_PY = `
from jevdb import JevDB

jevdb = JevDB(
    group_id="support-bot",
    retrieval={
        "mode": "automatic",     # "automatic" | "custom" | "both"
        "min_score": 0.8,        # only use graded decisions scoring at least this
        "same_tags": True,       # only examples that share this call's tags
        "max_examples": 3,
    },
)
`;

const ENABLE_JS = `
import { JevDB } from "@jevdb/sdk";

export const jevdb = new JevDB({
  groupId: "support-bot",
  retrieval: {
    mode: "automatic",   // "automatic" | "custom" | "both"
    minScore: 0.8,       // only use graded decisions scoring at least this
    sameTags: true,      // only examples that share this call's tags
    maxExamples: 3,
  },
});
`;

function Page({ current, sections, active, children }: {
  current: string;
  sections: { id: string; label: string }[];
  active?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav active="docs" />
      <div className="container docs">
        <aside className="docs__sidebar">
          <DocsNav current={current} />
          {sections.length > 0 && <p className="docs__group">On this page</p>}
          <nav>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className={`docs__link${active === s.id ? " docs__link--active" : ""}`}>
                {s.label}
              </a>
            ))}
          </nav>
        </aside>
        <article className="docs__content">{children}</article>
      </div>
      <Footer />
    </>
  );
}

export function RagDocs() {
  const active = useActiveSection(SECTION_IDS);

  return (
    <Page current="/docs/rag" sections={SECTIONS} active={active}>
      <div className="notice">
        <span className="tag tag--warn">Experimental</span>
        <p>Not built yet. Off by default, and it can help, hurt or do nothing, so always A/B test it.</p>
      </div>

      <section id="overview" className="doc">
        <h1>Retrieval (RAG)</h1>
        <p>
          Gets better as you grade. With retrieval on, the SDK adds good past decisions to a new Jev call&apos;s{" "}
          <code>state</code> as examples (few-shot). Examples are cached inside the SDK, so most calls get them
          with no extra network trip.
        </p>
        <p>There are two sources of examples, and you can use either or both:</p>
        <ul>
          <li><strong>A · Automatic</strong>: your best-graded decisions with the same tags, above a score you pick.</li>
          <li><strong>B · Custom</strong>: examples you write or pin by hand.</li>
        </ul>
      </section>

      <section id="walkthrough" className="doc">
        <h2>Walkthrough</h2>
        <p>
          Call 1 finds examples in the cache (hit). Then a decision gets graded. Call 2 misses the cache, so the
          SDK fetches fresh examples from JevDB once and saves them for the next calls.
        </p>
        <FitWidth>
          <SdkFlowRagStack />
        </FitWidth>
      </section>

      <section id="groups" className="doc">
        <h2>Turn it on per group</h2>
        <p>
          Retrieval is set per <code>group_id</code>, so you can turn it on for one feature (say{" "}
          <code>support-bot</code>) and leave every other group untouched. Toggle it in the console under the
          group, or in code:
        </p>
        <CodeTabs
          tabs={[
            { id: "py", label: "Python", file: "app/jevdb_client.py", code: ENABLE_PY },
            { id: "js", label: "JavaScript", file: "src/lib/jevdb.ts", code: ENABLE_JS },
          ]}
        />
      </section>

      <section id="automatic" className="doc">
        <h2>A · Automatic examples</h2>
        <p>
          JevDB picks the examples for you from decisions you already graded. A decision qualifies when it is in
          the same group, shares the call&apos;s tags, and its grade score is at least <code>min_score</code>.
          The highest scores win.
        </p>
        <DocTable
          head={["Option", "Default", "What it does"]}
          rows={[
            ["mode", "off", "automatic, custom or both. Off means no retrieval."],
            ["min_score", "0.8", "Only graded decisions at or above this score are used."],
            ["same_tags", "true", "Only use examples that share this call's tags."],
            ["max_examples", "3", "How many examples are added to each call."],
          ]}
        />
      </section>

      <section id="custom" className="doc">
        <h2>B · Custom examples</h2>
        <p>
          Hand-pick the examples yourself: write a state and the answer you expect, or pin a real past decision.
          Custom examples are always included for their group, before automatic ones.
        </p>
        <p>
          How to configure them: <a href="/docs/rag/custom-examples">Custom examples</a>.
        </p>
      </section>

      <section id="ab-test" className="doc">
        <h2>A/B testing</h2>
        <p>
          The original <code>state</code> and the added examples are logged separately, and every call records
          whether retrieval was on. Compare grades with and without it before you trust it.
        </p>
      </section>
    </Page>
  );
}

export function CustomExamplesDocs() {
  return (
    <Page current="/docs/rag" sections={[]}>
      <section className="doc">
        <h1>Custom examples</h1>
        <p>Coming soon. This page will explain how to add and manage hand-picked examples for retrieval.</p>
        <p>
          <a href="/docs/rag">← Back to Retrieval (RAG)</a>
        </p>
      </section>
    </Page>
  );
}
