"use client";

import { useCopy } from "@/hooks/useCopy";

type Props = {
  label: string;
  code: string;
};

// Plain code block. Comment lines (# or //) are dimmed; no full syntax highlighting.
export function CodeBlock({ label, code }: Props) {
  const { copied, copy } = useCopy();
  const lines = code.trim().split("\n");

  return (
    <figure className="code">
      <div className="code__bar">
        <span>{label}</span>
        <button type="button" className="code__copy" onClick={() => copy(code.trim())}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="code__body">
        <code>
          {lines.map((line, i) => {
            const isComment = /^\s*(#|\/\/)/.test(line);
            return (
              <span key={i} className={isComment ? "code__comment" : undefined}>
                {line}
                {"\n"}
              </span>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}
