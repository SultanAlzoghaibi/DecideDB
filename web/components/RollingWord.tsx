"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// A word that scrolls up to the next one every few seconds ("Jev" -> "Decision API" -> ...).
// The box animates its width to the current word, so the rest of the line never has a gap.
export function RollingWord({ words, interval = 2600 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [width, setWidth] = useState<number>();
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    // Respect "reduce motion": keep the first word, no scrolling.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);

  // Measure the current word so the box can shrink/grow to fit it.
  useLayoutEffect(() => {
    setWidth(refs.current[i]?.offsetWidth);
  }, [i]);

  return (
    <span className="roll" style={{ width }} aria-label={words[0]}>
      <span className="roll__track" style={{ transform: `translateY(-${i * 1.1}em)` }} aria-hidden="true">
        {words.map((w, n) => (
          <span key={w} ref={(el) => { refs.current[n] = el; }} className="roll__word">
            {w}
          </span>
        ))}
      </span>
    </span>
  );
}
