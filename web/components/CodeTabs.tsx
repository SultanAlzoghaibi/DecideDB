"use client";

import { useState } from "react";
import { CodeBlock } from "./CodeBlock";

export type CodeTab = { id: string; label: string; file: string; code: string };

// A segmented switch (e.g. Sync | Async) over code blocks. Pass `value` + `onChange` to share
// one choice across the page; leave them out for a switch that only affects itself.
export function CodeTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: CodeTab[];
  value?: string;
  onChange?: (id: string) => void;
}) {
  const [own, setOwn] = useState(tabs[0]!.id);
  const current = value ?? own;
  const select = onChange ?? setOwn;
  const tab = tabs.find((t) => t.id === current) ?? tabs[0]!;

  return (
    <div className="code-tabs">
      <div className="code-tabs__switch" role="tablist" aria-label="Code variant">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab.id}
            className={`code-tabs__tab${t.id === tab.id ? " code-tabs__tab--on" : ""}`}
            onClick={() => select(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <CodeBlock label={tab.file} code={tab.code} />
    </div>
  );
}
