import { CodeBlock } from "./CodeBlock";

const GRADE_EXAMPLE = `
# Every proxied response carries an x-jevdb-request-id header.
# Once you know the outcome, grade that request:
curl -X POST http://localhost:8080/v1/requests/req_8f2a1c/grade \\
  -H "Content-Type: application/json" \\
  -d '{ "grade": "good", "note": "customer accepted the refund" }'
`;

export function GradeSection() {
  return (
    <section className="section container split" aria-labelledby="grade-title">
      <div>
        <p className="eyebrow">Grading</p>
        <h2 id="grade-title" className="section__title">
          Judge decisions by outcomes, not vibes.
        </h2>
        <p className="section__body">
          Confidence tells you how sure Jev was. Grades tell you whether it was right. Send one
          request when the real result comes in, and the dashboard shows which question types
          and confidence ranges you can actually trust.
        </p>
        <ul className="checks">
          <li>Grade minutes or weeks later, using the request ID</li>
          <li>Re-grade any time; the latest grade wins</li>
          <li>Filter the table by graded, ungraded, good or bad</li>
        </ul>
      </div>
      <CodeBlock label="terminal" code={GRADE_EXAMPLE} />
    </section>
  );
}
