import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ConsoleTabs } from "@/components/ConsoleTabs";
import { requireProfile } from "@/lib/session";
import { getRagSetting } from "@/lib/rag";
import { saveRagAction } from "../actions";
import { RagSettingsForm } from "@/components/rag/RagSettingsForm";
import "@/styles/auth.css";
import "@/styles/decisions.css";

export const metadata: Metadata = { title: "RAG group · DecisionDB" };

// One group's retrieval settings: the form on the left, what each setting does on the right.
export default async function RagGroupPage({ params }: { params: Promise<{ group: string }> }) {
  const { profileId } = await requireProfile();
  const groupId = decodeURIComponent((await params).group);
  const s = await getRagSetting(profileId, groupId);
  if (!s) notFound();

  return (
    <>
      <Nav active="console" />
      <main className="container console dx">
        <a href="/console/rag" className="dx-back">← All groups</a>
        <div className="console__head">
          <h1 className="console__title">
            <span className="mono">{s.groupId}</span>{" "}
            {s.enabled ? <span className="badge badge--good">Retrieval on</span> : <span className="badge">Retrieval off</span>}
          </h1>
          <span className="muted">{s.calls.toLocaleString()} calls logged</span>
        </div>
        <ConsoleTabs current="/console/rag" />

        <div className="rag__detail">
          <section className="console__card">
            <h2>Settings</h2>
            <RagSettingsForm
              groupId={s.groupId}
              enabled={s.enabled}
              mode={s.mode}
              minScore={s.minScore}
              maxExamples={s.maxExamples}
              sameTags={s.sameTags}
              action={saveRagAction}
            />
          </section>

          <aside className="console__card rag__help">
            <h2>How it works</h2>
            <ol className="rs-how">
              <li>You grade calls good or bad (API or dashboard).</li>
              <li>The best ones become examples for this group.</li>
              <li>The SDK adds them to each new Jev call. Cached, so no extra wait.</li>
            </ol>
            <p className="rag__hint">
              Experimental: it can help, hurt or do nothing. Compare grades with it on and off.{" "}
              <a href="/docs/rag">Full guide →</a>
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
