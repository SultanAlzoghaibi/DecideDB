import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ConsoleTabs } from "@/components/ConsoleTabs";
import { CodeBlock } from "@/components/CodeBlock";
import { ConfidenceBar } from "@/components/decisions/ConfidenceBar";
import { ContextSun, ProbabilityBars, TypeBadge } from "@/components/decisions/bits";
import { requireProfile } from "@/lib/session";
import { getDecision } from "@/lib/decisions";
import "@/styles/auth.css";
import "@/styles/decisions.css";

export const metadata: Metadata = { title: "Decision · DecideDB" };

const pretty = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));

// One Jev call in full. getDecision() only returns it if it belongs to the logged-in
// profile; anything else (wrong id, someone else's) is a 404.
export default async function DecisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  const { id } = await params;
  const d = await getDecision(profile.profileId, id);
  if (!d) notFound();

  // Back to the list with the same filters the user came from.
  const sp = await searchParams;
  const back = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
  const ok = d.status === 200 && !d.error;

  return (
    <>
      <Nav active="console" />
      <main className="container console dx">
        <a href={`/console/decisions${back.size ? `?${back}` : ""}`} className="dx-back">
          ← All decisions
        </a>
        <div className="console__head">
          <h1 className="console__title dx-title">
            Decision <span className="mono muted">{d.decisionId ?? d.id}</span>
          </h1>
          {d.context && (
            <span className="dx-ctxpill">
              <ContextSun /> Context added
            </span>
          )}
        </div>
        <ConsoleTabs current="/console/decisions" />

        <section className="console__card">
          <dl className="dx-facts">
            <div>
              <dt>When</dt>
              <dd title={d.createdAt.toISOString()}>{d.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" })}</dd>
            </div>
            <div>
              <dt>Group</dt>
              <dd>{d.groupId ? <span className="badge">{d.groupId}</span> : "—"}</dd>
            </div>
            <div>
              <dt>User</dt>
              <dd className="mono">{d.userId ?? "—"}</dd>
            </div>
            <div>
              <dt>Tags</dt>
              <dd>{d.tags.length ? d.tags.map((t) => <span key={t} className="badge dx-tag">{t}</span>) : "—"}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd className="mono">
                {d.modelRequested}
                {d.modelUsed && d.modelUsed !== d.modelRequested && <span className="muted"> → {d.modelUsed}</span>}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{ok ? <span className="badge badge--good">{d.status} OK</span> : <span className="badge badge--bad">{d.status ?? "failed"}</span>}</dd>
            </div>
            <div>
              <dt>Latency</dt>
              <dd className="mono">{d.latencyMs != null ? `${Math.round(d.latencyMs)} ms` : "—"}</dd>
            </div>
            <div>
              <dt>Tokens</dt>
              <dd className="mono">{d.inputTokens != null ? `${d.inputTokens} in · ${d.outputTokens ?? 0} out` : "—"}</dd>
            </div>
          </dl>
          {d.error && <p className="dx-error mono">{d.error}</p>}
        </section>

        <section className="console__card">
          <h2>State</h2>
          <p className="dx-help">What Jev looked at.</p>
          <pre className="dx-state">{pretty(d.state)}</pre>
        </section>

        {d.context && (
          <section className="console__card dx-ctxcard">
            <h2>
              <ContextSun /> Context added by DecideDB
            </h2>
            <p className="dx-help">
              Retrieval was on for this call, so DecideDB added past graded examples before it went to Jev. This is exactly
              what was added.
            </p>
            <dl className="dx-facts dx-facts--small">
              <div>
                <dt>Source</dt>
                <dd className="mono">{d.context.source}</dd>
              </div>
              <div>
                <dt>Example set</dt>
                <dd className="mono">{d.context.exampleSet ?? "—"}</dd>
              </div>
              <div>
                <dt>Context id</dt>
                <dd className="mono">{d.context.id}</dd>
              </div>
            </dl>
            <CodeBlock label="context.json" code={pretty(d.context.body)} />
          </section>
        )}

        <h2 className="dx-sectiontitle">Questions &amp; answers</h2>
        {d.questions.map((q) => {
          const a = q.answer;
          return (
            <section key={q.key} id={`q-${q.key}`} className="console__card dx-qcard">
              <div className="dx-qcard__head">
                <span className="mono dx-qcard__key">{q.key}</span>
                <TypeBadge type={q.type} />
              </div>
              <p className="dx-qcard__text">{pretty(q.instructions)}</p>

              {!a ? (
                <p className="muted">No answer: the Jev call failed.</p>
              ) : (
                <div className="dx-qcard__answer">
                  <div className="dx-big">
                    {q.type === "noul" && a.noul != null && (
                      <>
                        <span className={a.noul >= 0.5 ? "dx-yes" : "dx-no"}>{a.noul >= 0.5 ? "Yes" : "No"}</span>
                        <span className="muted mono"> p(yes) = {a.noul.toFixed(2)}</span>
                      </>
                    )}
                    {q.type === "choice" && <span className="mono">{a.choice}</span>}
                    {q.type === "score" && a.score != null && (
                      <span className="mono">
                        {a.score.toFixed(2)} <span className="muted">/ {q.criteria.length - 1}</span>
                      </span>
                    )}
                  </div>
                  {a.confidence != null && (
                    <div className="dx-conf">
                      <span className="muted">Confidence</span> <ConfidenceBar value={a.confidence} />
                    </div>
                  )}
                  <ProbabilityBars probabilities={a.probabilities} chosen={a.choice} />
                </div>
              )}

              {q.criteria.length > 0 && (
                <details className="dx-details">
                  <summary>Criteria ({q.criteria.length})</summary>
                  <ul className="dx-criteria">
                    {q.criteria.map((c) => (
                      <li key={c.key}>
                        <span className="mono">{c.key}</span>
                        {c.description != null && <span className="muted"> · {pretty(c.description)}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          );
        })}

        <section className="console__card">
          <details className="dx-details">
            <summary>Raw request &amp; response JSON</summary>
            <CodeBlock label="request.json" code={pretty(d.rawRequest)} />
            {d.rawResponse != null && <CodeBlock label="response.json" code={pretty(d.rawResponse)} />}
          </details>
        </section>
      </main>
    </>
  );
}
