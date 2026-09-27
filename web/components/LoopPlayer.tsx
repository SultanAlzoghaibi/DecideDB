"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// Wait after pressing "Reset" before the first "call!" plays again.
const RESTART_DELAY_MS = 500;
// Playback speed of the diagram while the walkthrough is open (closed = 1x).
const WALKTHROUGH_RATE = 0.5;

export type Step = { t: number; text: string }; // t = seconds into the loop
export type Segment = { from: number; to: number; label: string }; // a labelled stretch of the loop

// Wraps an animated diagram with an optional "Walkthrough" player. The diagram just loops;
// opening the walkthrough shows:
//   play/pause · a scrubbable timeline with a tick per step · reset
// and a caption saying what is happening at the current moment.
//
// How it works: every CSS animation inside shares one loop length. Scrubbing pauses them all
// and sets each one's currentTime to the same point, so the whole diagram moves together.
// The timeline is a transparent native <input type="range"> (keyboard + screen reader
// support for free) layered over a custom-drawn track, fill, ticks and playhead.
export function LoopPlayer({
  loop,
  steps,
  segments,
  children,
}: {
  loop: number;
  steps: Step[];
  segments: Segment[];
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState(0);
  const loopMs = Math.round(loop * 1000);

  // The diagram's animations, minus the always-spinning sun rays.
  const animations = useCallback(
    () =>
      (root.current?.querySelector(".flow-player__stage")?.getAnimations({ subtree: true }) ?? []).filter(
        (a) => (a as CSSAnimation).animationName !== "sun-spin",
      ),
    [],
  );

  // Draw a position (ms into the loop). Called every frame while playing, so it writes to the
  // DOM directly and only touches React state when the step changes.
  const show = useCallback(
    (ms: number) => {
      const pct = `${(ms / loopMs) * 100}%`;
      if (fill.current) fill.current.style.width = pct;
      if (head.current) head.current.style.left = pct;
      if (input.current) input.current.value = String(ms);
      let i = 0;
      while (i + 1 < steps.length && steps[i + 1]!.t * 1000 <= ms) i++;
      setStep(i);
    },
    [steps, loopMs],
  );

  // While the walkthrough is open and playing, follow the animation clock every frame.
  useEffect(() => {
    if (!open || !playing) return;
    let frame = 0;
    const tick = () => {
      const now = animations()[0]?.currentTime;
      if (typeof now === "number") show(now % loopMs);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, animations, show, loopMs]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Slow the whole diagram down while the walkthrough is open, back to normal when closed.
  useEffect(() => {
    for (const a of animations()) a.updatePlaybackRate(open ? WALKTHROUGH_RATE : 1);
  }, [open, animations]);

  function seek(ms: number) {
    window.clearTimeout(timer.current);
    setPlaying(false);
    // One loop is added so animations with a delay are already looping, not waiting to start.
    for (const a of animations()) {
      a.pause();
      a.currentTime = loopMs + ms;
    }
    show(ms);
  }

  function togglePlay() {
    window.clearTimeout(timer.current);
    for (const a of animations()) {
      if (playing) a.pause();
      else a.play();
    }
    setPlaying(!playing);
  }

  function reset() {
    const all = animations();
    for (const a of all) {
      a.pause();
      a.currentTime = 0; // before every delay: the diagram shows its resting state
    }
    show(0);
    setPlaying(false);
    window.clearTimeout(timer.current); // pressing again restarts the wait
    timer.current = window.setTimeout(() => {
      for (const a of all) a.play();
      setPlaying(true);
    }, RESTART_DELAY_MS);
  }

  // Opening starts the walkthrough from step 1. Closing always leaves the diagram looping.
  function toggleOpen() {
    if (!open) {
      setOpen(true);
      reset();
      return;
    }
    setOpen(false);
    window.clearTimeout(timer.current);
    for (const a of animations()) a.play();
    setPlaying(true);
  }

  const now = steps[step]?.t ?? 0;
  const pctOf = (t: number) => `${(t / loop) * 100}%`;

  return (
    <div ref={root}>
      <div className="flow-player__stage">{children}</div>

      <div className="walkthrough">
        <button
          type="button"
          className={`walkthrough__toggle${open ? " walkthrough__toggle--open" : ""}`}
          onClick={toggleOpen}
          aria-expanded={open}
        >
          <StepsIcon />
          Walkthrough
          <ChevronIcon />
        </button>
      </div>

      {open && (
        <div className={`player${playing ? " player--playing" : ""}`}>
          <div className="player__row">
            <button
              type="button"
              className="player__icon-btn"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>

            <div className="player__timeline">
              {/* Which call each stretch of the timeline belongs to. */}
              <div className="player__segments" aria-hidden="true">
                {segments.map((s) => (
                  <span
                    key={s.label}
                    className={`player__segment${now >= s.from && now < s.to ? " player__segment--active" : ""}`}
                    style={{ left: pctOf(s.from), width: pctOf(s.to - s.from) }}
                  >
                    {s.label}
                  </span>
                ))}
              </div>

              <div className="player__track" aria-hidden="true">
                <div ref={fill} className="player__fill" />
                {steps.map((s, i) => (
                  <span
                    key={s.t}
                    className={`player__tick${i <= step ? " player__tick--passed" : ""}${i === step ? " player__tick--current" : ""}`}
                    style={{ left: pctOf(s.t) }}
                  />
                ))}
                <div ref={head} className="player__head" />
              </div>

              <input
                ref={input}
                type="range"
                className="player__input"
                min={0}
                max={loopMs}
                step={10}
                defaultValue={0}
                aria-label="Move through the loop"
                aria-valuetext={steps[step]?.text}
                onInput={(e) => seek(Number(e.currentTarget.value))}
              />
            </div>

            <button type="button" className="player__reset" onClick={reset}>
              <ResetIcon />
              Reset
            </button>
          </div>

          {/* key={step} remounts the caption on every step, which replays its slide-in. */}
          <p key={step} className="player__caption">
            <span className="player__count">
              {String(step + 1).padStart(2, "0")}/{String(steps.length).padStart(2, "0")}
            </span>
            {steps[step]?.text}
          </p>
        </div>
      )}
    </div>
  );
}

function StepsIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="3" cy="4" r="1.5" />
      <circle cx="3" cy="12" r="1.5" />
      <path d="M7 4h7M7 12h7M3 5.5v5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="walkthrough__chevron"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4.5 6 7.5 9 4.5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="2.5" y="1.5" width="2.5" height="9" rx="0.5" fill="currentColor" />
      <rect x="7" y="1.5" width="2.5" height="9" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" />
      <path d="M2.5 2.5v3h3" />
    </svg>
  );
}
