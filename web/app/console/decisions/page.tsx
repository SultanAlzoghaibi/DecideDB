import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { ConsoleTabs } from "@/components/ConsoleTabs";
import { ConfidenceBar } from "@/components/decisions/ConfidenceBar";
import { AnswerCell, ContextSun, TypeBadge } from "@/components/decisions/bits";
import { requireProfile } from "@/lib/session";
import { facetCounts, listDecisions, volumeHistogram, type DecisionFilters, type FacetCounts } from "@/lib/decisions";
import { parseQuery, rangeHours, RANGES, withToken, withoutToken, type Facet } from "@/lib/query";
import "@/styles/auth.css";
import "@/styles/decisions.css";

export const metadata: Metadata = { title: "Decisions · DecideDB" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

const FACET_TITLES: Record<keyof FacetCounts, string> = {
  status: "Status",
  type: "Type",
  group: "Group",
  user: "User",
  tag: "Tag",
  context: "Context added",
};
const VALUE_LABEL: Record<string, string> = { noul: "Yes / No", choice: "Choice", score: "Score", error: "Error", ok: "OK", yes: "Yes", no: "No" };

// Log-style timestamp: "Sep 28 10:22:54" (local time).
const logTime = (d: Date) =>
  `${d.toLocaleString("en-US", { month: "short", day: "2-digit" })} ${d.toLocaleTimeString("en-US", { hour12: false })}`;

const EXAMPLES = ["group:support-bot type:choice", "conf:<0.5", "context:yes tag:prod", "status:error", "refund"];

// A Datadog-style log explorer for Jev decisions: one query bar (`key:value` filters +
// free text), a time range, a volume histogram, facet counts, and the matching rows.
// Everything lives in the URL (?q=…&range=…), so any view is a shareable link.
export default async function DecisionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const profile = await requireProfile();
  const sp = await searchParams;
  const q = one(sp.q) ?? "";
  const range = one(sp.range) ?? "7d";
  const page = Math.max(1, Number(one(sp.page) ?? 1) || 1);

  const parsed = parseQuery(q);
  const filters: DecisionFilters = {
    q: parsed.text || undefined,
    group: parsed.group,
    user: parsed.user,
    type: parsed.type,
    tag: parsed.tag,
    context: parsed.context,
    status: parsed.status,
    minConf: parsed.minConf,
    maxConf: parsed.maxConf,
    sinceHours: rangeHours(range),
  };

  const [{ rows, hasMore, total }, facets, buckets] = await Promise.all([
    listDecisions(profile.profileId, filters, page),
    facetCounts(profile.profileId, filters),
    volumeHistogram(profile.profileId, filters),
  ]);

  // Build links that keep the other parts of the view.
  const link = (next: { q?: string; range?: string; page?: number }) => {
    const p = new URLSearchParams();
    const nq = next.q ?? q;
    const nr = next.range ?? range;
    if (nq) p.set("q", nq);
    if (nr !== "7d") p.set("range", nr);
    if (next.page && next.page > 1) p.set("page", String(next.page));
    return `/console/decisions${p.size ? `?${p}` : ""}`;
  };
  const detailQs = new URLSearchParams(Object.entries({ q, range: range !== "7d" ? range : "" }).filter(([, v]) => v));
  const peak = Math.max(1, ...buckets.map((b) => b.ok + b.error));
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "7d";

  return (
    <>
      <Nav active="console" />
      <main className="container console dx">
        <div className="console__head">
          <h1 className="console__title">Decisions</h1>
          <span className="dx-live">
            <i /> {total.toLocaleString()} {total === 1 ? "row" : "rows"} · {range === "all" ? "all time" : `last ${rangeLabel}`}
          </span>
        </div>
        <ConsoleTabs current="/console/decisions" />

        {/* Query bar: Enter to search. */}
        <form method="get" action="/console/decisions" className="dx-querybar">
          <span className="dx-prompt" aria-hidden="true">›</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search… e.g. group:support-bot type:choice conf:<0.6 refund"
            className="dx-query mono"
            aria-label="Search decisions"
            autoComplete="off"
            spellCheck={false}
          />
          {range !== "7d" && <input type="hidden" name="range" value={range} />}
          <nav className="dx-ranges" aria-label="Time range">
            {RANGES.map((r) => (
              <a key={r.key} href={link({ range: r.key })} className={`dx-range${r.key === range ? " dx-range--on" : ""}`}>
                {r.label}
              </a>
            ))}
          </nav>
        </form>

        {parsed.tokens.length > 0 ? (
          <div className="dx-chiprow">
            {parsed.tokens.map((t) => (
              <a key={t.raw} href={link({ q: withoutToken(q, t.raw) })} className="dx-token" title="Remove filter">
                <span className="muted">{t.key}:</span>
                {t.value} <span aria-hidden="true">×</span>
              </a>
            ))}
            {parsed.text && <span className="dx-token dx-token--text">“{parsed.text}”</span>}
            <a href={link({ q: "" })} className="dx-clear">
              Clear all
            </a>
          </div>
        ) : (
          <div className="dx-chiprow dx-examples">
            <span className="muted">Try</span>
            {EXAMPLES.map((e) => (
              <a key={e} href={link({ q: e })} className="dx-example mono">
                {e}
              </a>
            ))}
          </div>
        )}

        {/* Volume over time: each bar is one slice of the range; red is failed Jev calls. */}
        <div className="dx-histo" role="img" aria-label={`Decision volume over the ${rangeLabel} range`}>
          {buckets.map((b) => (
            <span key={b.start.toISOString()} className="dx-histo__bar" title={`${b.start.toLocaleString()} · ${b.ok} ok, ${b.error} errors`}>
              <span className="dx-histo__err" style={{ height: `${(b.error / peak) * 100}%` }} />
              <span className="dx-histo__ok" style={{ height: `${(b.ok / peak) * 100}%` }} />
            </span>
          ))}
        </div>

        <div className="dx-explorer">
          <aside className="dx-facets" aria-label="Facets">
            {(Object.keys(FACET_TITLES) as (keyof FacetCounts)[]).map((key) =>
              facets[key].length === 0 ? null : (
                <section key={key} className="dx-facet">
                  <h3>{FACET_TITLES[key]}</h3>
                  <ul>
                    {facets[key].map((f) => {
                      const tokenValue = key === "type" && f.value === "noul" ? "noul" : f.value;
                      const active = parsed.tokens.some((t) => t.key === key && t.value.toLowerCase() === tokenValue.toLowerCase());
                      const activeToken = parsed.tokens.find((t) => t.key === key)?.raw;
                      const href = active && activeToken ? link({ q: withoutToken(q, activeToken) }) : link({ q: withToken(q, key as Facet, tokenValue) });
                      return (
                        <li key={f.value}>
                          <a href={href} className={`dx-facet__item${active ? " dx-facet__item--on" : ""}`}>
                            <span className={`dx-facet__label${key === "status" ? ` dx-dot dx-dot--${f.value}` : ""}`}>
                              {VALUE_LABEL[f.value] ?? f.value}
                            </span>
                            <span className="dx-facet__count mono">{f.count.toLocaleString()}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ),
            )}
          </aside>

          <div className="dx-results">
            {total === 0 ? (
              <EmptyState filtered={q !== "" || range !== "all"} clearHref={link({ q: "", range: "all" })} />
            ) : (
              <div className="dx-tablewrap">
                <table className="table dx-table dx-stream">
                  <thead>
                    <tr>
                      <th aria-label="Status" className="dx-stripe" />
                      <th>Date</th>
                      <th>Group</th>
                      <th>User</th>
                      <th>Question</th>
                      <th>Type</th>
                      <th>Answer</th>
                      <th>Confidence</th>
                      <th aria-label="Context added" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const href = `/console/decisions/${r.requestId}${detailQs.size ? `?${detailQs}` : ""}${r.questionKey ? `#q-${r.questionKey}` : ""}`;
                      // Every cell links to the detail page, so the whole row is clickable.
                      const cell = (content: ReactNode, className?: string) => (
                        <td className={className}>
                          <a href={href} className="dx-cell" tabIndex={-1}>
                            {content}
                          </a>
                        </td>
                      );
                      return (
                        <tr key={r.answerId ?? r.requestId} className={r.type === "error" ? "dx-row--error" : undefined}>
                          <td className="dx-stripe" aria-label={r.type === "error" ? "error" : "ok"} />
                          <td>
                            <a href={href} className="dx-cell mono muted" title={r.createdAt.toISOString()}>
                              {logTime(r.createdAt)}
                            </a>
                          </td>
                          {cell(r.groupId ? <span className="badge">{r.groupId}</span> : <span className="muted">—</span>)}
                          {cell(<span className="mono">{r.userId ?? "—"}</span>)}
                          {cell(
                            r.questionKey ? (
                              <span className="dx-q">
                                <span className="mono">{r.questionKey}</span>
                                <span className="dx-q__text">{r.instruction}</span>
                              </span>
                            ) : (
                              <span className="muted">Jev call failed</span>
                            ),
                            "dx-qcell",
                          )}
                          {cell(<TypeBadge type={r.type} />)}
                          {cell(<AnswerCell row={r} />)}
                          {cell(
                            <ConfidenceBar
                              value={r.confidence}
                              title={r.type === "noul" ? "Yes/no answers have no confidence; this is certainty, max(p, 1 − p)" : "Jev's confidence"}
                            />,
                          )}
                          {cell(r.contextAdded ? <ContextSun /> : null, "dx-ctxcell")}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {total > 0 && (
              <div className="dx-pager">
                <span className="muted">
                  {((page - 1) * 50 + 1).toLocaleString()}–{((page - 1) * 50 + rows.length).toLocaleString()} of {total.toLocaleString()}
                </span>
                <span className="dx-pager__links">
                  {page > 1 && (
                    <a className="btn btn--ghost" href={link({ page: page - 1 })}>
                      ← Newer
                    </a>
                  )}
                  {hasMore && (
                    <a className="btn btn--ghost" href={link({ page: page + 1 })}>
                      Older →
                    </a>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function EmptyState({ filtered, clearHref }: { filtered: boolean; clearHref: string }) {
  if (filtered) {
    return (
      <div className="dx-tablewrap dx-nomatch">
        <p>No decisions match this search and time range.</p>
        <a href={clearHref} className="btn btn--ghost">
          Clear search, show all time
        </a>
      </div>
    );
  }
  return (
    <section className="console__card dx-empty">
      <h2>No decisions yet</h2>
      <p>Call Jev through the DecideDB SDK and every decision shows up here. Want to look around first? Add sample data:</p>
      <pre className="dx-cmd">cd web &amp;&amp; bun run db:seed --email you@example.com</pre>
      <a className="btn btn--ghost" href="/docs/sdk">
        Read the SDK quickstart
      </a>
    </section>
  );
}
