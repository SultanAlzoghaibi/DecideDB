"use client";

import { useEffect, useRef } from "react";

// How one Jev request's JSON is split into the SQL tables in db/migrations/0001_input.sql.
// One continuous, looping animation: every piece of the JSON lifts off as a chip and flies into
// its row at the same time (lightly staggered), the rows land, hold, fade, and it starts again.
//
// Two examples share the animation:
//   JsonToTableFlow      the plain Jev request
//   JsonToTableFlowMeta  what the SDK sends to DecisionDB: the Jev request wrapped with
//                        decisiondb_user_id, decisiondb_group_id and tags (who called what)

// ---------- The example request, line by line. `k` = which pieces a line belongs to. ----------
const JSON_LINES: { t: string; k: string[] }[] = [
  { t: "{", k: [] },
  { t: '  "model": "jev-latest",', k: ["model"] },
  { t: '  "state": "I was charged twice. Please fix this ASAP.",', k: ["state"] },
  { t: '  "questions": {', k: [] },
  { t: '    "is_billing": {', k: ["q1"] },
  { t: '      "type": "noul",', k: ["q1"] },
  { t: '      "instructions": "Is this about billing?"', k: ["q1", "q1i"] },
  { t: "    },", k: ["q1"] },
  { t: '    "tone": {', k: ["q2"] },
  { t: '      "type": "choice",', k: ["q2"] },
  { t: '      "instructions": "What is the tone?",', k: ["q2", "q2i"] },
  { t: '      "criteria": {', k: ["q2", "q2c"] },
  { t: '        "calm": null, "frustrated": null, "angry": null', k: ["q2", "q2c"] },
  { t: "      }", k: ["q2", "q2c"] },
  { t: "    }", k: ["q2"] },
  { t: "  }", k: [] },
  { t: "}", k: [] },
];

// ---------- One entry per piece of JSON and the table it goes to. ----------
type StepDef = { json: string[]; table: string };

const STEPS: StepDef[] = [
  { json: ["*"], table: "blob_req" },
  { json: ["state"], table: "states" },
  { json: ["model"], table: "requests" },
  { json: ["q1i"], table: "instructions" },
  { json: ["q1"], table: "question_versions" },
  { json: ["q2i"], table: "instructions" },
  { json: ["q2"], table: "question_versions" },
  { json: ["q2c"], table: "criteria" },
  { json: ["q1", "q2"], table: "request_questions" },
];

// ---------- The tables. `step` = the step that adds the row. ----------
type Table = { name: string; cols: string[]; rows: { cells: string[]; step: number }[] };

const TABLES: Table[] = [
  { name: "blob_req", cols: ["req_id", "body"], rows: [{ cells: ["r1", "{ …jsonb… }"], step: 0 }] },
  { name: "states", cols: ["id", "text", "hash"], rows: [{ cells: ["s1", "I was charged twice…", "9f2c…"], step: 1 }] },
  { name: "requests", cols: ["id", "model_req", "state_id"], rows: [{ cells: ["r1", "jev-latest", "s1"], step: 2 }] },
  {
    name: "instructions",
    cols: ["id", "text"],
    rows: [
      { cells: ["i1", "Is this about billing?"], step: 3 },
      { cells: ["i2", "What is the tone?"], step: 5 },
    ],
  },
  {
    name: "question_versions",
    cols: ["id", "question_key", "type", "instruction_id"],
    rows: [
      { cells: ["qv1", "is_billing", "noul", "i1"], step: 4 },
      { cells: ["qv2", "tone", "choice", "i2"], step: 6 },
    ],
  },
  {
    name: "criteria",
    cols: ["qv_id", "position", "option_key"],
    rows: [
      { cells: ["qv2", "0", "calm"], step: 7 },
      { cells: ["qv2", "1", "frustrated"], step: 7 },
      { cells: ["qv2", "2", "angry"], step: 7 },
    ],
  },
  {
    name: "request_questions",
    cols: ["request_id", "qv_id"],
    rows: [
      { cells: ["r1", "qv1"], step: 8 },
      { cells: ["r1", "qv2"], step: 8 },
    ],
  },
];

// ---------- Example 2: the DecisionDB envelope (who called what) ----------
// The SDK wraps the Jev request with caller info. Jev only ever receives the inner "request".
const META_LINES: { t: string; k: string[] }[] = [
  { t: "{", k: [] },
  { t: '  "decisiondb_user_id": "user_482",', k: ["user"] },
  { t: '  "decisiondb_group_id": "support-bot",', k: ["group"] },
  { t: '  "tags": ["prod", "tickets"],', k: ["tags"] },
  { t: '  "request": {', k: [] },
  { t: '    "model": "jev-latest",', k: ["model"] },
  { t: '    "state": "I was charged twice.",', k: ["state"] },
  { t: '    "questions": {', k: [] },
  { t: '      "tone": {', k: ["q2"] },
  { t: '        "type": "choice",', k: ["q2"] },
  { t: '        "instructions": "What is the tone?",', k: ["q2", "q2i"] },
  { t: '        "criteria": {', k: ["q2", "q2c"] },
  { t: '          "calm": null,', k: ["q2", "q2c"] },
  { t: '          "frustrated": null,', k: ["q2", "q2c"] },
  { t: '          "angry": null', k: ["q2", "q2c"] },
  { t: "        }", k: ["q2", "q2c"] },
  { t: "      }", k: ["q2"] },
  { t: "    }", k: [] },
  { t: "  }", k: [] },
  { t: "}", k: [] },
];

const META_STEPS: StepDef[] = [
  { json: ["*"], table: "blob_req" },
  { json: ["state"], table: "states" },
  { json: ["model", "user", "group"], table: "requests" },
  { json: ["tags"], table: "request_tags" },
  { json: ["q2i"], table: "instructions" },
  { json: ["q2"], table: "question_versions" },
  { json: ["q2c"], table: "criteria" },
  { json: ["q2"], table: "request_questions" },
];

const META_TABLES: Table[] = [
  { name: "blob_req", cols: ["req_id", "body"], rows: [{ cells: ["r1", "{ …jsonb… }"], step: 0 }] },
  { name: "states", cols: ["id", "text", "hash"], rows: [{ cells: ["s1", "I was charged twice…", "9f2c…"], step: 1 }] },
  {
    name: "requests",
    cols: ["id", "model_req", "state_id", "user_id", "group_id"],
    rows: [{ cells: ["r1", "jev-latest", "s1", "user_482", "support-bot"], step: 2 }],
  },
  {
    name: "request_tags",
    cols: ["request_id", "tag"],
    rows: [
      { cells: ["r1", "prod"], step: 3 },
      { cells: ["r1", "tickets"], step: 3 },
    ],
  },
  { name: "instructions", cols: ["id", "text"], rows: [{ cells: ["i1", "What is the tone?"], step: 4 }] },
  { name: "question_versions", cols: ["id", "question_key", "type", "instruction_id"], rows: [{ cells: ["qv1", "tone", "choice", "i1"], step: 5 }] },
  {
    name: "criteria",
    cols: ["qv_id", "position", "option_key"],
    rows: [
      { cells: ["qv1", "0", "calm"], step: 6 },
      { cells: ["qv1", "1", "frustrated"], step: 6 },
      { cells: ["qv1", "2", "angry"], step: 6 },
    ],
  },
  { name: "request_questions", cols: ["request_id", "qv_id"], rows: [{ cells: ["r1", "qv1"], step: 7 }] },
];

type Example = { file: string; lines: { t: string; k: string[] }[]; steps: StepDef[]; tables: Table[]; chips?: Record<string, string> };

// Loop timing (ms).
const READ = 1000; // the JSON sits still this long first, so people can read it
const STAGGER = 45; // gap between chips leaving: small, so it reads as one morph
const FLY = 900; // one chip's flight
const HOLD = 2600; // everything filled in, before fading out
const FADE = 500;

// The chip shows the row's most telling value: its longest cell that isn't just an id or position.
const longestValue = (cells: string[]) =>
  cells.filter((c) => !/^((r|s|i|qv)\d|\d)$/.test(c)).sort((a, b) => b.length - a.length)[0] ?? cells[0]!;

// Every row with the JSON piece it comes from, in the order they fly.
const buildRows = (ex: Example) =>
  ex.tables
    .flatMap((tb) => tb.rows.map((r) => ({ ...r, table: tb.name })))
    .sort((a, b) => a.step - b.step)
    .map((r, i) => ({
      ...r,
      order: i,
      json: ex.steps[r.step]!.json,
      chip: ex.chips?.[`${r.table}:${r.cells.join("|")}`] ?? longestValue(r.cells),
    }));

const BASIC: Example = { file: "request.json", lines: JSON_LINES, steps: STEPS, tables: TABLES };
const META: Example = {
  file: "sent to DecisionDB",
  lines: META_LINES,
  steps: META_STEPS,
  tables: META_TABLES,
  // The requests row carries the caller info, so its chip shows who called.
  chips: { "requests:r1|jev-latest|s1|user_482|support-bot": "user_482 · support-bot" },
};

export const JsonToTableFlow = () => <Flow ex={BASIC} />;
export const JsonToTableFlowMeta = () => <Flow ex={META} />;

function Flow({ ex }: { ex: Example }) {
  const ROWS = buildRows(ex);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.querySelectorAll<HTMLElement>(".j2t__row").forEach((r) => (r.style.opacity = "1"));
      return;
    }

    let alive = true;
    let timers: number[] = [];
    let anims: Animation[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    function run() {
      if (!alive || !root) return;
      const box = root.getBoundingClientRect();
      const rows = [...root.querySelectorAll<HTMLElement>(".j2t__row")];
      rows.forEach((r) => (r.style.opacity = "0"));

      ROWS.forEach((row, i) => {
        const dst = root.querySelector<HTMLElement>(`.j2t__row[data-order="${row.order}"]`)!;
        const chip = root.querySelector<HTMLElement>(`.j2t__chip[data-order="${row.order}"]`)!;
        const lines = [...root.querySelectorAll<HTMLElement>(".j2t__line")].filter((l) => {
          const k = (l.dataset.k ?? "").split(" ");
          return row.json.includes("*") || k.some((x) => row.json.includes(x));
        });
        const src = lines[0] ?? root;
        const a = src.getBoundingClientRect();
        const b = dst.getBoundingClientRect();
        const from = `translate(${a.left - box.left + 16}px, ${a.top - box.top}px)`;
        const to = `translate(${b.left - box.left + 6}px, ${b.top - box.top}px)`;
        const delay = READ + i * STAGGER;

        // The source lines glow as their piece leaves.
        for (const l of lines) {
          anims.push(
            l.animate(
              [{ backgroundColor: "rgba(212,91,182,0)" }, { backgroundColor: "rgba(212,91,182,0.16)", color: "#fff" }, { backgroundColor: "rgba(212,91,182,0)" }],
              { duration: FLY, delay },
            ),
          );
        }
        // The chip flies in an arc (lifted a little mid-way).
        const mid = `translate(${(a.left + b.left) / 2 - box.left}px, ${Math.min(a.top, b.top) - box.top - 24}px)`;
        anims.push(
          chip.animate(
            [
              { transform: `${from} scale(.8)`, opacity: 0 },
              { transform: from, opacity: 1, offset: 0.12 },
              { transform: mid, opacity: 1, offset: 0.5 },
              { transform: to, opacity: 1, offset: 0.9 },
              { transform: `${to} scale(.9)`, opacity: 0 },
            ],
            { duration: FLY, delay, easing: "cubic-bezier(.45,0,.2,1)", fill: "both" },
          ),
        );
        // The row lands with a brief pink tint.
        anims.push(
          dst.animate(
            [
              { opacity: 0, backgroundColor: "rgba(212,91,182,0.25)" },
              { opacity: 1, backgroundColor: "rgba(212,91,182,0.25)", offset: 0.3 },
              { opacity: 1, backgroundColor: "rgba(212,91,182,0)" },
            ],
            { duration: 700, delay: delay + FLY * 0.85, fill: "forwards" },
          ),
        );
      });

      const json = root.querySelector<HTMLElement>(".j2t__json");
      if (json) {
        anims.push(json.animate([{ opacity: 1 }, { opacity: 0.35 }], { duration: FLY, delay: READ + 150, fill: "forwards", easing: "ease-in-out" }));
      }

      const filled = READ + (ROWS.length - 1) * STAGGER + FLY + 700;
      later(() => {
        anims.push(...rows.map((r) => r.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE, fill: "forwards" })));
        if (json) anims.push(json.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: FADE, fill: "forwards" }));
      }, filled + HOLD);
      later(() => {
        anims.forEach((x) => x.cancel());
        anims = [];
        run();
      }, filled + HOLD + FADE + 300);
    }

    run();
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      timers = [];
      anims.forEach((x) => x.cancel());
    };
  }, [ex]); // ROWS comes from `ex`, a constant example, so `ex` is the only dependency

  return (
    <div ref={stage} className="j2t j2t--flow">
      <figure className="j2t__json">
        <figcaption className="j2t__label">{ex.file}</figcaption>
        <pre>
          {ex.lines.map((l, i) => (
            <span key={i} className="j2t__line" data-k={l.k.join(" ")}>
              {l.t}
              {"\n"}
            </span>
          ))}
        </pre>
      </figure>

      <div className="j2t__tables">
        {ex.tables.map((tb) => (
          <div key={tb.name} className={`j2t__table${tb.cols.length >= 5 ? " j2t__table--wide" : ""}`}>
            <p className="j2t__label">{tb.name}</p>
            <table>
              <thead>
                <tr>
                  {tb.cols.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.filter((r) => r.table === tb.name).map((r) => (
                  <tr key={r.order} className="j2t__row" data-order={r.order}>
                    {r.cells.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {ROWS.map((r) => (
        <span key={r.order} className="j2t__chip" data-order={r.order} aria-hidden="true">
          {r.chip}
        </span>
      ))}
    </div>
  );
}
