import { Burst, Pulse, vars, type Dir } from "./SdkFlow";
import { Logo } from "./Logo";
import { ResetLoop } from "./ResetLoop";

// "Advanced" diagram: the self-improving loop (retrieval / RAG, experimental).
// Same look as SdkFlowJoined, plus an example cache in the SDK and a grading lane.
//
// One loop = two calls (times below on the 9.6s scale, stretched by SLOW) (see "RAG diagram" in app.css):
//   call 1, cache HIT  (most calls): examples added from memory, no extra network trip
//     0.0 call! + "hit" · 0.6 request (+examples) to Jev, copy to DecisionDB · 1.8 response back
//     2.6 response! + copy of response to DecisionDB
//   grading: 3.6 your grading code sends a score to DecisionDB
//   call 2, cache MISS: SDK fetches examples from DecisionDB first, then calls Jev as usual
//     4.8 call! + "miss" + fetch down · 5.6 examples back · 6.4 "saved", request to Jev + copy
//     7.6 response back · 8.4 response! + copy of response

// Speed of every ML diagram (RAG 1-3): all times are written on a base scale and multiplied
// by SLOW. The loop length is passed to CSS as --loop, so this is the only number to change.
export const SLOW = 2;
const at = (t: number) => `${+(t * SLOW).toFixed(2)}s`;

// Several pulses can share one line, each firing at its own time.
function Pulses({ dir, delays }: { dir: Dir; delays: string[] }) {
  return delays.map((d) => <Pulse key={d} dir={dir} delay={d} />);
}

// White flash on a box when a pulse lands. A box can be hit several times per loop,
// so each hit is its own overlay with its own delay.
export function Hits({ delays }: { delays: string[] }) {
  return delays.map((d) => <i key={d} className="flow__hit" style={vars({ "--delay": d })} />);
}

// Small pill that pops next to the cache: "hit", "miss", "saved".
export function Status({ text, kind, delay }: { text: string; kind: "good" | "bad" | "accent"; delay: string }) {
  return (
    <span className={`flow__status flow__status--${kind}`} style={vars({ "--delay": delay })}>
      {text}
    </span>
  );
}

function CylinderIcon() {
  return (
    <svg width="11" height="13" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <ellipse cx="6" cy="3" rx="5" ry="2" />
      <path d="M1 3v8c0 1.1 2.24 2 5 2s5-.9 5-2V3" />
    </svg>
  );
}

const LABEL =
  "Advanced, experimental: your app calls Jev through the DecisionDB SDK, which keeps a cache of well-graded past examples. On a cache hit the examples are added to the request instantly. On a miss the SDK first fetches examples from DecisionDB, then calls Jev. Copies of each request and response go to DecisionDB in the background, and your grading code sends scores to DecisionDB.";

export function SdkFlowRag() {
  return (
    <ResetLoop>
      <div className="flow flow--rag" role="img" aria-label={LABEL} style={vars({ "--loop": `${9.6 * SLOW}s` })}>
        {/* Outlines first so they paint underneath. */}
        <div className="flow__frame flow__frame--top">
          <span className="flow__frame-label">your app</span>
        </div>
        <div className="flow__frame flow__frame--grader">
          <span className="flow__frame-label"><span className="hide-sm">your app · </span>grading</span>
        </div>

        {/* Top lane: the Jev call. */}
        <div className="flow__node flow__node--app">your code</div>
        <div className="flow__node flow__node--sdk">
          decisiondb sdk
          <Burst text="call!" delay={at(0)} />
          <Burst text="response!" delay={at(2.6)} />
          <Burst text="call!" delay={at(4.8)} />
          <Burst text="response!" delay={at(8.4)} />
          <span className="flow__cache">
            <CylinderIcon />
            cache
            <Status text="hit · examples ready" kind="good" delay={at(0)} />
            <Status text="miss · fetching" kind="bad" delay={at(4.8)} />
            <Status text="saved" kind="accent" delay={at(6.4)} />
          </span>
        </div>

        <div className="flow__link flow__link--main flow__link--to-jev">
          <div className="flow__line">
            <span className="flow__label">request + examples</span>
            <Pulses dir="fwd" delays={[at(0.6), at(6.4)]} />
          </div>
          <div className="flow__line">
            <span className="flow__label">response</span>
            <Pulses dir="back" delays={[at(1.8), at(7.6)]} />
          </div>
        </div>
        <div className="flow__node flow__node--jev">
          <span className="flow__brand">
            <img className="flow__jev-logo" src="/jev-logo.png" alt="" width={24} height={24} />
            Jev API
          </span>
          <Hits delays={[at(1.4), at(7.2)]} />
        </div>

        {/* SDK <-> DecisionDB: background copies (left) and the cache-miss fetch (right). */}
        <div className="flow__link flow__link--db">
          <div className="flow__line flow__line--async">
            <span className="flow__label flow__label--left">copies</span>
            <Pulses dir="copy-out" delays={[at(0.6), at(2.6), at(6.4), at(8.4)]} />
          </div>
          <div className="flow__line">
            <span className="flow__label flow__label--right">on a miss: fetch examples</span>
            <Pulse dir="copy-out" delay={at(4.8)} />
            <Pulse dir="copy-in" delay={at(5.6)} />
          </div>
        </div>

        {/* Bottom lane: grading feeds scores into DecisionDB. */}
        <div className="flow__pair flow__pair--grader">
          <div className="flow__node">your code</div>
          <div className="flow__node flow__node--sdk-sm">sdk</div>
        </div>
        <div className="flow__link flow__link--main flow__link--score">
          <div className="flow__line flow__line--async">
            <span className="flow__label">score</span>
            <Pulse dir="fwd" delay={at(3.6)} />
          </div>
        </div>
        <div className="flow__node flow__node--db">
          <span className="flow__brand">
            <Logo size={14} />
            DecisionDB
          </span>
          <small>grades · examples</small>
          <Hits delays={[at(1.4), at(3.4), at(4.4), at(5.6), at(7.2), at(9.2)]} />
        </div>
      </div>

      <p className="flow__caption">
        Most calls hit the cache, so examples are added with no extra network trip. On a miss the SDK fetches them from
        DecisionDB first.
      </p>
    </ResetLoop>
  );
}
