// Illustrative preview of the dashboard's requests table. Sample data only.

import { ConfidenceBar } from "./decisions/ConfidenceBar";

type Grade = "good" | "bad" | null;

type Row = {
  id: string;
  time: string;
  type: "Noul" | "Choice" | "Score";
  answer: string;
  confidence: number;
  grade: Grade;
};

const ROWS: Row[] = [
  { id: "req_8f2a1c", time: "14:02:11", type: "Choice", answer: "refund_request", confidence: 0.91, grade: "good" },
  { id: "req_8f29e7", time: "14:01:58", type: "Noul", answer: "yes", confidence: 0.74, grade: null },
  { id: "req_8f29b0", time: "14:01:40", type: "Score", answer: "7.2 / 10", confidence: 0.62, grade: "bad" },
  { id: "req_8f2981", time: "14:01:12", type: "Choice", answer: "billing", confidence: 0.88, grade: "good" },
  { id: "req_8f2944", time: "14:00:57", type: "Noul", answer: "no", confidence: 0.55, grade: null },
];

export function RequestsPreview() {
  return (
    <figure className="preview">
      <div className="preview__bar">
        <span className="preview__title">requests</span>
        <div className="preview__tabs" aria-hidden="true">
          <span className="preview__tab preview__tab--active">All</span>
          <span className="preview__tab">Graded</span>
          <span className="preview__tab">Ungraded</span>
        </div>
      </div>

      <div className="preview__scroll">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th className="hide-sm">Time</th>
              <th>Type</th>
              <th>Answer</th>
              <th className="hide-sm">Confidence</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.id}>
                <td className="mono">{row.id}</td>
                <td className="mono muted hide-sm">{row.time}</td>
                <td>
                  <span className="badge">{row.type}</span>
                </td>
                <td className="mono">{row.answer}</td>
                <td className="hide-sm">
                  <ConfidenceBar value={row.confidence} />
                </td>
                <td>
                  <GradeBadge grade={row.grade} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <figcaption className="preview__caption">Sample data</figcaption>
    </figure>
  );
}

function GradeBadge({ grade }: { grade: Grade }) {
  if (grade === null) return <span className="badge">Ungraded</span>;
  return <span className={`badge badge--${grade}`}>{grade === "good" ? "Good" : "Bad"}</span>;
}
