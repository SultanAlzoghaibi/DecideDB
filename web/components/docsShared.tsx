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

// Links to the other docs pages, shown at the top of every docs sidebar.
export const DOC_PAGES = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/sdk", label: "Client SDK" },
];

export function DocsNav({ current }: { current: string }) {
  return (
    <>
      <p className="docs__group">Docs</p>
      <nav>
        {DOC_PAGES.map((p) => (
          <a key={p.href} href={p.href} className={`docs__link${p.href === current ? " docs__link--active" : ""}`}>
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
