"use client";

import { useCopy } from "@/hooks/useCopy";
import { highlight, langFromLabel, type Lang } from "@/lib/highlight";

type Props = {
  label: string;
  code: string;
  lang?: Lang; // defaults to a guess from the label ("main.py" -> python)
};

// Code block with JetBrains Darcula-style syntax colors (Python, TS/JS, JSON, terminal).
export function CodeBlock({ label, code, lang }: Props) {
  const { copied, copy } = useCopy();
  const source = code.trim();
  const tokens = highlight(source, lang ?? langFromLabel(label));

  return (
    <figure className="code">
      <div className="code__bar">
        <span>{label}</span>
        <button type="button" className="code__copy" onClick={() => copy(source)}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="code__body">
        <code>
          {tokens.map((t, i) =>
            t.kind ? (
              <span key={i} className={`tok tok--${t.kind}`}>
                {t.text}
              </span>
            ) : (
              t.text
            ),
          )}
        </code>
      </pre>
    </figure>
  );
}
