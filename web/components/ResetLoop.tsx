"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Wait after pressing "Reset loop" before the first "call!" plays again.
const RESTART_DELAY_MS = 500;

// Wraps an animated diagram with a "Reset loop" button. Pressing it rewinds every CSS
// animation inside to the start, holds for RESTART_DELAY_MS, then plays them all again
// in sync (so the loop begins with "call!").
export function ResetLoop({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function reset() {
    const el = ref.current;
    if (!el) return;
    // getAnimations({ subtree: true }) returns the running CSS animations of every element inside.
    const animations = el.getAnimations({ subtree: true });
    for (const a of animations) {
      a.pause();
      a.currentTime = 0; // time 0 is before every delay, so the diagram shows its resting state
    }
    window.clearTimeout(timer.current); // pressing again restarts the wait
    timer.current = window.setTimeout(() => {
      for (const a of animations) a.play();
    }, RESTART_DELAY_MS);
  }

  return (
    <div ref={ref}>
      {children}
      <div className="flow-reset">
        <button type="button" className="btn btn--ghost" onClick={reset}>
          Reset loop
        </button>
      </div>
    </div>
  );
}
