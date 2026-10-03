// Small presentational pieces for the decisions dashboard (no data fetching here).
import type { DecisionRow } from "@/lib/decisions";

const TYPE_LABEL = { noul: "Yes / No", choice: "Choice", score: "Score", error: "Error" } as const;

export function TypeBadge({ type }: { type: keyof typeof TYPE_LABEL }) {
  return <span className={`badge dx-type dx-type--${type}`}>{TYPE_LABEL[type]}</span>;
}

// The answer in plain words: "yes · 0.97", "frustrated", "1.7 / 2", or the error status.
export function AnswerCell({ row }: { row: DecisionRow }) {
  if (row.type === "error") return <span className="badge badge--bad">HTTP {row.status ?? "error"}</span>;
  if (row.type === "noul" && row.noul != null) {
    const yes = row.noul >= 0.5;
    return (
      <span className="dx-answer">
        <span className={yes ? "dx-yes" : "dx-no"}>{yes ? "yes" : "no"}</span>
        <span className="muted mono">p={row.noul.toFixed(2)}</span>
      </span>
    );
  }
  if (row.type === "choice") return <span className="dx-answer mono">{row.choice ?? "—"}</span>;
  if (row.type === "score" && row.score != null) {
    return (
      <span className="dx-answer mono">
        {row.score.toFixed(2)} <span className="muted">/ {(row.levels ?? 1) - 1}</span>
      </span>
    );
  }
  return <span className="muted">—</span>;
}

// The "context was added" mark: the same sun as the landing page's RAG diagram.
export function ContextSun({ label = "Context added by DecisionDB" }: { label?: string }) {
  return (
    <svg className="dx-sun" viewBox="-10 -10 20 20" width="16" height="16" role="img" aria-label={label}>
      <title>{label}</title>
      <g className="dx-sun__rays">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1="0" y1="-6" x2="0" y2="-8.5" transform={`rotate(${a})`} />
        ))}
      </g>
      <circle r="3.6" />
    </svg>
  );
}

// One bar per option, the chosen one highlighted.
export function ProbabilityBars({ probabilities, chosen }: { probabilities: Record<string, number>; chosen?: string | null }) {
  const entries = Object.entries(probabilities);
  if (!entries.length) return null;
  return (
    <ul className="dx-probs">
      {entries.map(([k, p]) => (
        <li key={k} className={k === chosen ? "dx-probs__row dx-probs__row--on" : "dx-probs__row"}>
          <span className="dx-probs__key mono">{k}</span>
          <span className="dx-probs__track">
            <span className="dx-probs__fill" style={{ width: `${Math.round(p * 100)}%` }} />
          </span>
          <span className="dx-probs__val mono">{p.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}

export function timeAgo(d: Date): string {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
