import type { CSSProperties } from "react";
import { Logo } from "./Logo";
import { LoopPlayer, type Segment, type Step } from "./LoopPlayer";

// Animated "how it works" diagram: your app <-> decisiondb sdk <-> Jev API, with the SDK
// copying the request up to DecisionDB and the response down to DecisionDB in the background.
//
// Four looks, all sharing one 4.8s animation loop (timings in TIMING below) (see "Flow diagram" in app.css):
//   SdkFlow        A: SDK as its own box
//   SdkFlowNested  B: your code + SDK inside a "your app" outline, linked by lines
//   SdkFlowJoined  C: your code + SDK as one block split in two, "call!" burst on the seam
//   SdkFlowWrapped D: SDK drawn as a layer wrapped around your code

type Variant = "split" | "nested" | "joined" | "wrapped";
export type Dir = "fwd" | "back" | "copy-in" | "copy-out";

export const vars = (v: Record<string, string>) => v as CSSProperties;

// A glowing dot that travels one line. `delay` places it in the loop.
export function Pulse({ dir, delay }: { dir: Dir; delay: string }) {
  return <i className={`flow__pulse flow__pulse--${dir}`} style={vars({ "--delay": delay })} />;
}

const SPARK_ANGLES = [0, 60, 120, 180, 240, 300];

// A pill ("call!") that pops with sparks. Used where your code hands off to the SDK,
// since that's a plain function call inside your app, not a network hop.
export function Burst({ text, delay }: { text: string; delay: string }) {
  return (
    <span className="flow__burst" style={vars({ "--delay": delay })}>
      {SPARK_ANGLES.map((a) => (
        <i key={a} className="flow__spark" style={vars({ "--a": `${a}deg` })} />
      ))}
      <span className="flow__burst-text">{text}</span>
      {/* With the sparks, a tiny arrow shows the direction: call → sdk, response ← sdk. */}
      <svg className={`flow__stub flow__stub--${text.startsWith("call") ? "right" : "left"}`} viewBox="0 0 14 10" aria-hidden="true">
        <path d="M1 5h11M8 1.5 12 5 8 8.5" />
      </svg>
    </span>
  );
}

// "call!" when your code calls the SDK, "response!" when the SDK hands the answer back.
function Bursts({ ret }: { ret: string }) {
  return (
    <>
      <Burst text="call!" delay="0s" />
      <Burst text="response!" delay={ret} />
    </>
  );
}

// When things fire in the 4.8s loop.
//   send: request leaves for Jev + copy of request leaves for DecisionDB
//   back: Jev's response leaves Jev
//   ret:  response reaches your code + copy of response leaves for DecisionDB
// A/B spend 0.8s on the your code -> SDK line first. C/D have no line: "call!" and both
// sends happen at the same moment.
const TIMING = {
  line: { send: "0.8s", back: "2s", ret: "2.8s" },
  touch: { send: "0s", back: "1.2s", ret: "2s" },
};

export function DecisionDBNode({ side }: { side: "in" | "out" }) {
  return (
    <div className={`flow__node flow__node--${side}`}>
      <span className="flow__brand">
        <Logo size={14} />
        DecisionDB
      </span>
      <small>{side === "in" ? "request" : "response"}</small>
    </div>
  );
}

// Step guide for the basic diagrams (C and C2), in seconds on C's 4.8s loop.
const BASIC_STEPS: Step[] = [
  { t: 0, text: "Your code calls Jev through the SDK. A copy of the request goes to DecisionDB in the background." },
  { t: 0.8, text: "Jev gets the request. The copy is saved in DecisionDB without slowing your call." },
  { t: 1.2, text: "Jev answers. The response heads back to the SDK." },
  { t: 2.0, text: "Your code gets the answer. A copy of the response goes to DecisionDB." },
  { t: 2.8, text: "Saved: DecisionDB now has the full request and response, ready to browse and grade." },
];

const BASIC_SEGMENTS: Segment[] = [
  { from: 0, to: 1.2, label: "request" },
  { from: 1.2, to: 2.8, label: "response" },
  { from: 2.8, to: 4.8, label: "saved" },
];

const scaleSteps = (k: number) => BASIC_STEPS.map((s) => ({ ...s, t: s.t * k }));
const scaleSegments = (k: number, end = 4.8) =>
  BASIC_SEGMENTS.map((s) => ({ ...s, from: s.from * k, to: Math.min(s.to, end) * k }));

const LABEL =
  "Your app calls the Jev API through the DecisionDB SDK. On the way out, the SDK sends a copy of the request to DecisionDB; on the way back, it sends a copy of the response. Both copies are sent in the background without blocking your app.";

function Flow({ variant }: { variant: Variant }) {
  const framed = variant === "nested" || variant === "joined";
  const t = variant === "joined" || variant === "wrapped" ? TIMING.touch : TIMING.line;

  const diagram = (
    <>
      <div className={`flow flow--${variant}`} role="img" aria-label={LABEL}>
        {/* Outline around your code + the SDK. First in the DOM so it paints underneath. */}
        {framed && (
          <div className="flow__frame">
            <span className="flow__frame-label">your app</span>
          </div>
        )}

        <DecisionDBNode side="in" />
        <div className="flow__link flow__link--copy flow__link--up">
          <div className="flow__line">
            <span className="flow__label">copy of request</span>
            <Pulse dir="copy-in" delay={t.send} />
          </div>
        </div>

        {variant === "wrapped" ? (
          <div className="flow__app">
            <span className="flow__frame-label">your app</span>
            <div className="flow__shell">
              <span className="flow__shell-label">decisiondb sdk</span>
              <div className="flow__code">
                your code
                <Bursts ret={t.ret} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flow__node flow__node--app">{variant === "split" ? "your app" : "your code"}</div>
            {/* A and B draw your code -> SDK as a line; C touches them instead. */}
            {variant !== "joined" && (
              <div className="flow__link flow__link--main flow__link--to-sdk">
                <div className="flow__line">
                  <Pulse dir="fwd" delay="0s" />
                </div>
                <div className="flow__line">
                  <Pulse dir="back" delay={t.ret} />
                </div>
              </div>
            )}
            <div className="flow__node flow__node--sdk">
              decisiondb sdk
              {variant === "split" && <small>in your app</small>}
              {variant === "joined" && <Bursts ret={t.ret} />}
            </div>
          </>
        )}

        <div className="flow__link flow__link--main flow__link--to-jev">
          <div className="flow__line">
            <span className="flow__label">request</span>
            <Pulse dir="fwd" delay={t.send} />
          </div>
          <div className="flow__line">
            <span className="flow__label">response</span>
            <Pulse dir="back" delay={t.back} />
          </div>
        </div>
        <div className="flow__node flow__node--jev">
          <span className="flow__brand">
            {/* Jev's logo, cropped into a circle by CSS. Decorative: the text says what it is. */}
            <img className="flow__jev-logo" src="/jev-logo.png" alt="" width={24} height={24} />
            Jev API
          </span>
        </div>

        <div className="flow__link flow__link--copy flow__link--down">
          <div className="flow__line">
            <span className="flow__label">copy of response</span>
            <Pulse dir="copy-out" delay={t.ret} />
          </div>
        </div>
        <DecisionDBNode side="out" />
      </div>

    </>
  );

  // C (the landing-page version) gets the step-by-step player.
  if (variant !== "joined") return diagram;
  return (
    <LoopPlayer loop={4.8} steps={BASIC_STEPS} segments={BASIC_SEGMENTS}>
      {diagram}
    </LoopPlayer>
  );
}

// C with a single DecisionDB under the SDK: both copies (request, then response) drop into it.
// This is the basic diagram on the landing page.
// ONE_DB_SLOW stretches C's timing for this version only; CSS reads the loop length from --loop.
// The loop is 3.4 base seconds (not C's 4.8), so there's only a short rest after the response copy lands.
const ONE_DB_SLOW = 2;
const slow = (d: string) => `${+(parseFloat(d) * ONE_DB_SLOW).toFixed(2)}s`;

export function SdkFlowOneDb() {
  const t = { send: slow(TIMING.touch.send), back: slow(TIMING.touch.back), ret: slow(TIMING.touch.ret) };
  return (
    <LoopPlayer loop={3.4 * ONE_DB_SLOW} steps={scaleSteps(ONE_DB_SLOW)} segments={scaleSegments(ONE_DB_SLOW, 3.4)}>
      <div className="flow flow--joined flow--one-db" role="img" aria-label={LABEL} style={vars({ "--loop": slow("3.4s"), "--ping": slow("0.8s") })}>
        <div className="flow__frame">
          <span className="flow__frame-label">your app</span>
        </div>

        <div className="flow__node flow__node--app">your code</div>
        <div className="flow__node flow__node--sdk">
          decisiondb sdk
          <Bursts ret={t.ret} />
        </div>

        <div className="flow__link flow__link--main flow__link--to-jev">
          <div className="flow__line">
            <span className="flow__label">request</span>
            <Pulse dir="fwd" delay={t.send} />
          </div>
          <div className="flow__line">
            <span className="flow__label">response</span>
            <Pulse dir="back" delay={t.back} />
          </div>
        </div>
        <div className="flow__node flow__node--jev">
          <span className="flow__brand">
            <img className="flow__jev-logo" src="/jev-logo.png" alt="" width={24} height={24} />
            Jev API
          </span>
        </div>

        {/* Both copies go down into the one DecisionDB: request copy (left), response copy (right). */}
        <div className="flow__link flow__link--db">
          <div className="flow__line flow__line--async">
            <span className="flow__label flow__label--left">copy of request</span>
            <Pulse dir="copy-out" delay={t.send} />
          </div>
          <div className="flow__line flow__line--async">
            <span className="flow__label flow__label--right">copy of response</span>
            <Pulse dir="copy-out" delay={t.ret} />
          </div>
        </div>
        <div className="flow__node flow__node--db">
          <span className="flow__brand">
            <Logo size={14} />
            DecisionDB
          </span>
          <small>requests · responses</small>
          {/* Flashes when each copy lands (0.8s and 2.8s into C's loop, slowed). */}
          <i className="flow__hit" style={vars({ "--delay": slow("0.8s") })} />
          <i className="flow__hit" style={vars({ "--delay": slow("2.8s") })} />
        </div>
      </div>

    </LoopPlayer>
  );
}

export const SdkFlow = () => <Flow variant="split" />;
export const SdkFlowNested = () => <Flow variant="nested" />;
export const SdkFlowJoined = () => <Flow variant="joined" />;
export const SdkFlowWrapped = () => <Flow variant="wrapped" />;
