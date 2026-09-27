import { Burst, vars } from "./SdkFlow";
import { Hits, SLOW, Status } from "./SdkFlowRag";
import { Logo } from "./Logo";
import { LoopPlayer, type Segment, type Step } from "./LoopPlayer";

// Two more looks for the RAG diagram where the cache is its own box inside your app
// (from the hand sketch), instead of a chip on the SDK:
//   SdkFlowRagSide   cache sits down-right of the SDK: lookup arrow in, return arrow back,
//                    and on a miss the cache fetches from JevDB through its own line
//   SdkFlowRagStack  cache sits right under the SDK, on the line to JevDB: a lookup dips
//                    into the cache; a miss continues through it down to JevDB
//
// Dots: a plain pink dot is a normal request/response. A pink dot with a spinning sun ring is
// RAG-augmented: examples coming back from the cache or JevDB, the augmented request, and the
// response Jev returned for it (plus the copies of both). The legend explains the two.
//
// Timeline (base seconds, stretched by SLOW from SdkFlowRag.tsx; CSS loop = 10.4s × SLOW).
// Network trips take 0.8 base seconds. Cache trips (SDK ⇄ cache) take 0.3: the cache is
// in memory, so it should look almost instant next to the network.
//   call 1 · HIT   0 call! + lookup · 0.3 "hit", back to SDK · 0.6 request + copy
//                  1.8 response back · 2.6 response! + copy
//   grading        3.6 score → JevDB
//   call 2 · MISS  4.8 call! + lookup · 5.1 "miss", fetch → JevDB · 5.9 examples → cache
//                  6.7 "saved", back to SDK · 7.0 request + copy · 8.2 response back
//                  9.0 response! + copy
const at = (t: number) => `${+(t * SLOW).toFixed(2)}s`;

// What's happening at each moment, in plain words. Shown under the diagram and followed by
// the slider (times are the base seconds from the timeline above).
const STEPS: Step[] = [
  { t: 0, text: "Your code calls Jev through the SDK. The SDK checks its cache first." },
  { t: 0.3, text: "Hit: examples for this question are already in memory. No network wait." },
  { t: 0.6, text: "Request + examples go to Jev. A copy goes to JevDB in the background." },
  { t: 1.8, text: "Jev answers, guided by the examples." },
  { t: 2.6, text: "Your code gets the answer. A copy is saved to JevDB." },
  { t: 3.6, text: "Once the real outcome is known, your grading code scores the decision." },
  { t: 4.8, text: "A new question. The SDK checks the cache again." },
  { t: 5.1, text: "Miss: nothing cached for this question yet. The SDK asks JevDB and waits." },
  { t: 5.9, text: "JevDB returns its best-graded examples. The cache keeps them." },
  { t: 6.7, text: "The examples are handed to the SDK." },
  { t: 7.0, text: "Request + examples go to Jev, with a copy to JevDB." },
  { t: 8.2, text: "Jev answers, guided by the examples." },
  { t: 9.0, text: "Your code gets the answer. Next time, this question is a cache hit." },
].map((s) => ({ ...s, t: s.t * SLOW }));

// Labelled stretches of the timeline (base seconds, same timeline).
const SEGMENTS: Segment[] = [
  { from: 0, to: 3.6, label: "call 1 · cache hit" },
  { from: 3.6, to: 4.8, label: "grading" },
  { from: 4.8, to: 10.4, label: "call 2 · cache miss" },
].map((s) => ({ ...s, from: s.from * SLOW, to: s.to * SLOW }));

// "f…" moves are the fast cache trips.
type Move = "right" | "left" | "down" | "up" | "dl" | "ru" | "fdown" | "fup" | "frd" | "flu";

// A travelling dot. `move` picks the path (straight, or an elbow like "frd" = fast right-then-down).
function Dot({ move, t, ctx = false }: { move: Move; t: number; ctx?: boolean }) {
  return (
    <i className={`flow__pulse flow__dot flow__dot--${move}${ctx ? " flow__dot--ctx" : ""}`} style={vars({ "--delay": at(t) })}>
      {ctx && <SunRing />}
    </i>
  );
}

// Rays drawn around a dot to mark "carries RAG context". The rays spin (see .flow__sun).
function SunRing() {
  return (
    <svg className="flow__sun" viewBox="-10 -10 20 20" aria-hidden="true">
      <g className="flow__sun-rays">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1="0" y1="-6" x2="0" y2="-7.8" transform={`rotate(${a})`} />
        ))}
      </g>
      <circle r="4" />
    </svg>
  );
}

// Explains the two kinds of dot.
function Legend() {
  return (
    <div className="flow-legend">
      <span className="flow-legend__item">
        <i className="flow-legend__dot" /> plain request
      </span>
      <span className="flow-legend__item">
        <svg className="flow-legend__sun flow__sun" viewBox="-10 -10 20 20" aria-hidden="true">
          <g className="flow__sun-rays">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <line key={a} x1="0" y1="-6" x2="0" y2="-7.8" transform={`rotate(${a})`} />
            ))}
          </g>
          <circle r="4" />
        </svg>
        RAG-augmented (examples, and the response to them)
      </span>
    </div>
  );
}

function Cylinder({ label }: { label: string }) {
  return (
    <>
      <svg className="flow__cyl-shape" viewBox="0 0 76 58" preserveAspectRatio="none" aria-hidden="true">
        <path d="M1 10 V48 A37 9 0 0 0 75 48 V10" />
        <ellipse cx="38" cy="10" rx="37" ry="9" />
      </svg>
      <span className="flow__cyl-label">{label}</span>
    </>
  );
}

function CacheStatuses() {
  return (
    <>
      <Status text="hit · examples ready" kind="good" delay={at(0.3)} />
      <Status text="miss" kind="bad" delay={at(5.1)} />
      <Status text="saved" kind="accent" delay={at(6.7)} />
    </>
  );
}

const LABEL =
  "Advanced, experimental: your code calls Jev through the JevDB SDK. The SDK first looks in its cache of well-graded past examples. On a hit the examples come straight back; on a miss the cache fetches them from JevDB first. Then the request with examples goes to Jev and the response returns as usual. Copies of each request and response go to JevDB in the background, and your grading code sends scores to JevDB.";

function RagCacheFlow({ layout }: { layout: "side" | "stack" }) {
  return (
    <LoopPlayer loop={10.4 * SLOW} steps={STEPS} segments={SEGMENTS}>
      <div className="flow-scroll">
        <div
          className={`flow flow--rag2 flow--rag-${layout}`}
          role="img"
          aria-label={LABEL}
          style={vars({ "--loop": `${10.4 * SLOW}s` })}
        >
          <div className="flow__frame flow__frame--top">
            <span className="flow__frame-label">your app</span>
          </div>
          <div className="flow__frame flow__frame--grader">
            <span className="flow__frame-label">grading</span>
          </div>

          <div className="flow__node flow__node--app">your code</div>
          <div className="flow__node flow__node--sdk">
            jevdb sdk
            <Burst text="call!" delay={at(0)} />
            <Burst text="response!" delay={at(2.6)} />
            <Burst text="call!" delay={at(4.8)} />
            <Burst text="response!" delay={at(9.0)} />

            {/* The cache and its connections live inside the SDK's box so their
                positions are measured from the SDK (see app.css). */}
            <div className="flow__cyl">
              <Cylinder label="cache" />
              <CacheStatuses />
            </div>

            {layout === "side" ? (
              <>
                {/* SDK → cache (lookup) */}
                <div className="flow__elbow flow__elbow--lookup">
                  <span className="flow__elbow-label">lookup</span>
                  <Dot move="frd" t={0} />
                  <Dot move="frd" t={4.8} />
                </div>
                {/* cache → SDK (examples back) */}
                <div className="flow__elbow flow__elbow--return">
                  <Dot move="flu" t={0.3} ctx />
                  <Dot move="flu" t={6.7} ctx />
                </div>
                {/* cache ⇄ JevDB, only on a miss */}
                <div className="flow__elbow flow__elbow--fetch">
                  <span className="flow__elbow-label flow__elbow-label--fetch">on a miss: fetch</span>
                  <Dot move="dl" t={5.1} />
                  <Dot move="ru" t={5.9} ctx />
                </div>
              </>
            ) : (
              <>
                {/* SDK ⇄ cache: the lookup dips down and comes back up */}
                <div className="flow__seg flow__seg--lookup">
                  <Dot move="fdown" t={0} />
                  <Dot move="fup" t={0.3} ctx />
                  <Dot move="fdown" t={4.8} />
                  <Dot move="fup" t={6.7} ctx />
                </div>
                {/* cache ⇄ JevDB, only on a miss */}
                <div className="flow__seg flow__seg--fetch">
                  <span className="flow__elbow-label flow__elbow-label--seg">on a miss: fetch</span>
                  <Dot move="down" t={5.1} />
                  <Dot move="up" t={5.9} ctx />
                </div>
              </>
            )}
          </div>

          <div className="flow__link flow__link--main flow__link--to-jev">
            <div className="flow__line">
              <span className="flow__label">request + examples</span>
              <Dot move="right" t={0.6} ctx />
              <Dot move="right" t={7.0} ctx />
            </div>
            <div className="flow__line">
              <span className="flow__label">response</span>
              <Dot move="left" t={1.8} ctx />
              <Dot move="left" t={8.2} ctx />
            </div>
          </div>
          <div className="flow__node flow__node--jev">
            <span className="flow__brand">
              <img className="flow__jev-logo" src="/jev-logo.png" alt="" width={24} height={24} />
              Jev API
            </span>
            <Hits delays={[at(1.4), at(7.8)]} />
          </div>

          {/* SDK → JevDB copies: request copy (left) and response copy (right). */}
          <div className="flow__link flow__link--db">
            <div className="flow__line flow__line--async">
              <span className="flow__label flow__label--left">copies</span>
              <Dot move="down" t={0.6} ctx />
              <Dot move="down" t={7.0} ctx />
            </div>
            <div className="flow__line flow__line--async">
              <Dot move="down" t={2.6} ctx />
              <Dot move="down" t={9.0} ctx />
            </div>
          </div>

          <div className="flow__pair flow__pair--grader">
            <div className="flow__node">your code</div>
            <div className="flow__node flow__node--sdk-sm">sdk</div>
          </div>
          <div className="flow__link flow__link--main flow__link--score">
            <div className="flow__line flow__line--async">
              <span className="flow__label">score</span>
              <Dot move="right" t={3.6} />
            </div>
          </div>
          <div className="flow__node flow__node--db">
            <span className="flow__brand">
              <Logo size={14} />
              JevDB
            </span>
            <small>grades · examples</small>
            <Hits delays={[at(1.4), at(3.4), at(4.4), at(5.9), at(7.8), at(9.8)]} />
          </div>
        </div>
      </div>
      <Legend />
    </LoopPlayer>
  );
}

export const SdkFlowRagSide = () => <RagCacheFlow layout="side" />;
export const SdkFlowRagStack = () => <RagCacheFlow layout="stack" />;
