"use client";

import { useState } from "react";
import type { RagMode } from "@/lib/rag";

type Props = {
  groupId: string;
  enabled: boolean;
  mode: RagMode;
  minScore: number;
  maxExamples: number;
  sameTags: boolean;
  action: (form: FormData) => Promise<void>; // saveRagAction
};

const SOURCES: { value: RagMode; title: string; hint: string }[] = [
  { value: "automatic", title: "Best-graded", hint: "Picked for you from calls graded good" },
  { value: "custom", title: "My examples", hint: "Only the ones you wrote by hand" },
  { value: "both", title: "Both", hint: "Yours first, then best-graded" },
];

// Retrieval settings for one group. Posts the same fields as before
// (mode, min_score, max_examples, same_tags) to the saveRagAction server action.
export function RagSettingsForm(p: Props) {
  const [on, setOn] = useState(p.enabled);
  const [mode, setMode] = useState<RagMode>(p.mode);
  const [minScore, setMinScore] = useState(p.minScore);
  const [max, setMax] = useState(p.maxExamples);
  const [sameTags, setSameTags] = useState(p.sameTags);

  const dirty =
    on !== p.enabled ||
    (on && (mode !== p.mode || minScore !== p.minScore || max !== p.maxExamples || sameTags !== p.sameTags));

  return (
    <form action={p.action} className="rs">
      <input type="hidden" name="group_id" value={p.groupId} />
      <input type="hidden" name="mode" value={on ? mode : "off"} />
      <input type="hidden" name="min_score" value={minScore} />
      <input type="hidden" name="max_examples" value={max} />
      {sameTags && <input type="hidden" name="same_tags" value="on" />}

      {/* The one decision that matters: on or off. */}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`rs-main${on ? " rs-main--on" : ""}`}
        onClick={() => setOn(!on)}
      >
        <span className="rs-main__text">
          <span className="rs-main__title">
            Learn from past decisions <span className="tag tag--warn">Experimental</span>
          </span>
          <span className="rs-main__sub">
            {on
              ? `Adds up to ${max} good past examples to each Jev call in this group.`
              : "Off: Jev calls go out exactly as your app wrote them."}
          </span>
        </span>
        <span className="rs-switch" aria-hidden="true" />
      </button>

      {on && (
        <>
          <div className="rs-block">
            <span className="rs-label">Where examples come from</span>
            <div className="rs-seg" role="radiogroup">
              {SOURCES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === s.value}
                  className={`rs-seg__opt${mode === s.value ? " rs-seg__opt--on" : ""}`}
                  onClick={() => setMode(s.value)}
                >
                  <span className="rs-seg__title">{s.title}</span>
                  <span className="rs-seg__hint">{s.hint}</span>
                </button>
              ))}
            </div>
            {mode !== "automatic" && (
              <a className="rs-link" href="/docs/rag/custom-examples">
                How to add your own examples →
              </a>
            )}
          </div>

          <details className="rs-more">
            <summary>Fine-tune</summary>

            <div className="rs-row">
              <div>
                <span className="rs-label">Quality bar</span>
                <span className="rs-hint">Only use calls graded at least this well</span>
              </div>
              <div className="rs-range">
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  aria-label="Minimum grade score"
                />
                <span className="mono rs-range__value">{minScore.toFixed(2)}</span>
              </div>
            </div>

            <div className="rs-row">
              <div>
                <span className="rs-label">Examples per call</span>
                <span className="rs-hint">More = more context, more tokens</span>
              </div>
              <div className="rs-steps" role="radiogroup" aria-label="Examples per call">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={max === n}
                    className={`rs-steps__n${max === n ? " rs-steps__n--on" : ""}`}
                    onClick={() => setMax(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="rs-row">
              <div>
                <span className="rs-label">Match tags</span>
                <span className="rs-hint">prod learns from prod, tests from tests</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={sameTags}
                aria-label="Match tags"
                className={`rs-switch rs-switch--sm${sameTags ? " rs-switch--on" : ""}`}
                onClick={() => setSameTags(!sameTags)}
              />
            </div>
          </details>
        </>
      )}

      <div className="rs-save">
        <button className="btn btn--primary" type="submit" disabled={!dirty}>
          {dirty ? "Save changes" : "Saved"}
        </button>
      </div>
    </form>
  );
}
