"use client";

import { useEffect, useState } from "react";

// Shared pieces for the docs pages (/docs and /docs/sdk).

// Highlights the sidebar link for whichever section is currently near the top of the screen.
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]!);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0]!.target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

// The docs tree, shown at the top of every docs sidebar. Children are indented.
export const DOC_PAGES = [
  { href: "/docs", label: "Overview", depth: 0 },
  { href: "/docs/sdk", label: "SDK", depth: 0 },
  { href: "/docs/sdk/python", label: "Python", depth: 1 },
  { href: "/docs/sdk/js", label: "JS / TS", depth: 1 },
  { href: "/docs/rag", label: "Retrieval (RAG)", depth: 0 },
];

export function DocsNav({ current }: { current: string }) {
  return (
    <>
      <p className="docs__group">Docs</p>
      <nav className="docs__tree">
        {DOC_PAGES.map((p) => (
          <a
            key={p.href}
            href={p.href}
            className={`docs__link${p.depth ? " docs__link--child" : ""}${p.href === current ? " docs__link--active" : ""}`}
          >
            {p.label}
          </a>
        ))}
      </nav>
    </>
  );
}

export function DocTable({ head, rows, mono = [0] }: { head: string[]; rows: string[][]; mono?: number[] }) {
  return (
    <div className="doc__table">
      <table className="table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i} className={mono.includes(i) ? "mono" : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
