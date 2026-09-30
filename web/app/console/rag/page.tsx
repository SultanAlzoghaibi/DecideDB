import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { ConsoleTabs } from "@/components/ConsoleTabs";
import { requireProfile } from "@/lib/session";
import { listRagSettings, RAG_DEFAULTS } from "@/lib/rag";
import { saveRagAction } from "./actions";
import "@/styles/auth.css";
import "@/styles/decisions.css";

export const metadata: Metadata = { title: "RAG · JevDB" };

type Search = Record<string, string | string[] | undefined>;
const MODE_LABEL = { automatic: "A · Automatic", custom: "B · Custom", both: "Both" };

// Every group with its retrieval settings, in one compact table. Search is a plain GET
// form (?q=…), so a filtered view is a shareable link. Click a group to edit it.
export default async function RagPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { profileId } = await requireProfile();
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const all = await listRagSettings(profileId);
  const rows = q ? all.filter((s) => s.groupId.toLowerCase().includes(q.toLowerCase())) : all;
  const onCount = all.filter((s) => s.enabled).length;

  return (
    <>
      <Nav active="console" />
      <main className="container console dx">
        <div className="console__head">
          <h1 className="console__title">
            Retrieval (RAG) <span className="tag tag--warn">Experimental</span>
          </h1>
          <span className="muted rag__summary">
            {onCount} of {all.length} groups on · <a href="/docs/rag">How it works →</a>
          </span>
        </div>
        <ConsoleTabs current="/console/rag" />

        <div className="rag__bar">
          <form method="get" action="/console/rag" className="dx-querybar rag__search">
            <span className="dx-prompt" aria-hidden="true">›</span>
            <input name="q" defaultValue={q} placeholder="Search groups…" className="dx-query mono" aria-label="Search groups" />
          </form>
          <form action={saveRagAction} className="rag__add">
            <input type="hidden" name="after" value="open" />
            <input type="hidden" name="mode" value="off" />
            <input type="hidden" name="min_score" value={RAG_DEFAULTS.minScore} />
            <input type="hidden" name="same_tags" value="on" />
            <input type="hidden" name="max_examples" value={RAG_DEFAULTS.maxExamples} />
            <input className="input" name="group_id" placeholder="new-group-id" required maxLength={200} aria-label="New group id" />
            <button className="btn btn--ghost" type="submit">Add group</button>
          </form>
        </div>

        <div className="dx-tablewrap">
          <table className="table rag__table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Augment context</th>
                <th>Min score</th>
                <th>Max examples</th>
                <th>Same tags</th>
                <th className="rag__num">Calls</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const href = `/console/rag/${encodeURIComponent(s.groupId)}`;
                return (
                  <tr key={s.groupId} className="rag__row">
                    <td className="mono">
                      <a href={href} className="rag__rowlink">{s.groupId}</a>
                    </td>
                    <td>{s.enabled ? <span className="badge badge--good">{MODE_LABEL[s.mode]}</span> : <span className="badge">Off</span>}</td>
                    <td className="mono">≥ {s.minScore}</td>
                    <td className="mono">{s.maxExamples}</td>
                    <td>{s.sameTags ? "Yes" : "No"}</td>
                    <td className="mono rag__num">{s.calls.toLocaleString()}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="console__empty">
                    {q ? `No group matches “${q}”.` : "No groups yet. Log a call with a group_id, or add one above."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
