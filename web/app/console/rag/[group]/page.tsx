import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ConsoleTabs } from "@/components/ConsoleTabs";
import { requireProfile } from "@/lib/session";
import { getRagSetting } from "@/lib/rag";
import { saveRagAction } from "../actions";
import "@/styles/auth.css";
import "@/styles/decisions.css";

export const metadata: Metadata = { title: "RAG group · JevDB" };

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
            <form action={saveRagAction} className="rag__form">
              <input type="hidden" name="group_id" value={s.groupId} />

              <fieldset className="rag__modes">
                <legend className="field__label">Augment context</legend>
                <label className="rag__choice">
                  <input type="radio" name="mode" value="off" defaultChecked={!s.enabled} />
                  <span>
                    <span className="rag__title"><strong>Off</strong> <span className="badge">Default</span></span>
                    <span className="rag__hint">Jev calls are sent exactly as your app wrote them</span>
                  </span>
                </label>
                <label className="rag__choice">
                  <input type="radio" name="mode" value="automatic" defaultChecked={s.enabled && s.mode === "automatic"} />
                  <span>
                    <span className="rag__title"><strong>A · Automatic</strong> <span className="tag tag--warn">Experimental</span></span>
                    <span className="rag__hint">Your best-graded past decisions in this group</span>
                  </span>
                </label>
                <label className="rag__choice">
                  <input type="radio" name="mode" value="custom" defaultChecked={s.enabled && s.mode === "custom"} />
                  <span>
                    <span className="rag__title"><strong>B · Custom</strong> <span className="tag tag--warn">Experimental</span></span>
                    <span className="rag__hint">
                      Examples you pick by hand · <a href="/docs/rag/custom-examples">how to set them up</a>
                    </span>
                  </span>
                </label>
                <label className="rag__choice">
                  <input type="radio" name="mode" value="both" defaultChecked={s.enabled && s.mode === "both"} />
                  <span>
                    <span className="rag__title"><strong>Both</strong> <span className="tag tag--warn">Experimental</span></span>
                    <span className="rag__hint">Custom first, then automatic to fill up</span>
                  </span>
                </label>
              </fieldset>

              <div className="rag__fields">
                <label className="field">
                  <span className="field__label">Min grade score (0–1)</span>
                  <input className="input" type="number" name="min_score" min={0} max={1} step={0.05} defaultValue={s.minScore} />
                </label>
                <label className="field">
                  <span className="field__label">Max examples per call</span>
                  <input className="input" type="number" name="max_examples" min={1} max={10} defaultValue={s.maxExamples} />
                </label>
              </div>
              <label className="rag__toggle">
                <input type="checkbox" name="same_tags" defaultChecked={s.sameTags} />
                <span>
                  <strong>Only same tags</strong>
                  <span className="rag__hint">Examples must share the call&apos;s tags (e.g. prod)</span>
                </span>
              </label>

              <button className="btn btn--primary" type="submit">Save</button>
            </form>
          </section>

          <aside className="console__card rag__help">
            <h2>How it works</h2>
            <p>
              When augment context is not Off, the SDK adds up to <strong>{s.maxExamples}</strong> examples to the{" "}
              <code>state</code> of every Jev call in <span className="mono">{s.groupId}</span>. Examples are cached in
              the SDK, so most calls need no extra network trip.
            </p>
            <dl className="rag__defs">
              <dt>Off (default)</dt>
              <dd>Nothing is added. Your calls go to Jev unchanged.</dd>
              <dt>A · Automatic</dt>
              <dd>Graded decisions from this group scoring at least the min score. Highest first.</dd>
              <dt>B · Custom</dt>
              <dd>
                Hand-written examples, always included. <a href="/docs/rag/custom-examples">Setup docs →</a>
              </dd>
              <dt>Min grade score</dt>
              <dd>Higher = fewer but better examples. Start around 0.8.</dd>
              <dt>Max examples</dt>
              <dd>More examples = more context and tokens per call. 3 is a good start.</dd>
              <dt>Only same tags</dt>
              <dd>Keeps prod calls learning from prod, experiments from experiments.</dd>
            </dl>
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
