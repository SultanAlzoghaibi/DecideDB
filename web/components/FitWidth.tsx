"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Shrinks a fixed-width child (like the 848px flow diagrams) to fit its column, instead of
// making it scroll sideways. Uses CSS `zoom`, which, unlike `transform: scale`, also shrinks
// the space the child takes up, so there's no empty gap under it. Never scales up.
export function FitWidth({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      i.style.zoom = "1";
      const natural = i.scrollWidth;
      i.style.zoom = String(Math.min(1, o.clientWidth / natural));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer}>
      <div ref={inner} style={{ width: "max-content", maxWidth: "none", margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}
