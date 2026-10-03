// Decisions: saving Jev calls into Postgres, and reading them back for the dashboard.
// Server-only (uses the pg pool). Every function takes a profileId, and every query
// filters by it, so a profile only ever sees its own decisions.
//
// Tables: db/migrations/0001..0004 (diagram in notes/db-schema.md).
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

// One Jev call as the SDKs send it (sdk/python/README.md → "What gets sent to DecisionDB").
export type DecisionRecord = {
  id: string;
  started_at: string;
  latency_ms?: number;
  status: number | null;
  error?: string | null;
  user_id?: string | null;
  group_id?: string | null;
  tags?: string[];
  request: JevRequest;
  response: unknown;
  sdk?: string;
};

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type QuestionType = "noul" | "choice" | "score";
type JevQuestion = { type: QuestionType; instructions: Json; criteria?: Json };
type JevRequest = { model?: string; state: Json; questions: Record<string, JevQuestion> };
type JevAnswer = {
  type: QuestionType;
  noul?: number;
  choice?: string;
  score?: number;
  confidence?: number;
  probabilities?: Record<string, number>;
};
type JevResponse = {
  model?: string;
  answers?: Record<string, JevAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

// Context DecisionDB auto-added to a call (e.g. retrieved examples).
export type AddedContext = { source?: string; example_set?: string | null; body: Json };

// ─────────────────────────────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────────────────────────────

// Same JSON always gives the same hash, whatever order its keys were written in.
function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}
const hash = (v: unknown) => createHash("sha256").update(stableJson(v)).digest("hex");

// Jev allows free-form content as a plain string or as structured JSON; we store
// strings in `text` and everything else in `body` (exactly one is set).
const textOrBody = (v: Json) => (typeof v === "string" ? { text: v, body: null } : { text: null, body: v });

// Insert a deduped row (unique on profile_id + hash) and return its id either way.
async function upsertId(db: PoolClient, sql: string, params: unknown[]): Promise<string> {
  const r = await db.query<{ id: string }>(sql, params);
  return r.rows[0]!.id;
}

// Criteria rows for one question: choice options, score levels, or noul true/false.
function criteriaRows(q: JevQuestion): { key: string; value: Json }[] {
  const c = q.criteria;
  if (q.type === "score" && Array.isArray(c)) return c.map((value, i) => ({ key: String(i), value }));
  if (c && typeof c === "object" && !Array.isArray(c)) return Object.entries(c).map(([key, value]) => ({ key, value }));
  return [];
}

// Save one Jev call for a profile, in a single transaction (all tables or none).
// Returns the request id. Saving the same decision id twice is a no-op (retries).
export async function saveDecision(profileId: string, rec: DecisionRecord, context?: AddedContext): Promise<string> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");

    const existing = await db.query<{ id: string }>(
      "SELECT id FROM requests WHERE profile_id = $1 AND decision_id = $2",
      [profileId, rec.id],
    );
    if (existing.rows[0]) {
      await db.query("ROLLBACK");
      return existing.rows[0].id;
    }

    const req = rec.request;
    const res = (rec.response && typeof rec.response === "object" ? rec.response : {}) as JevResponse;
    const ok = rec.status === 200 && !rec.error;

    // State (deduped per profile).
    const st = textOrBody(req.state);
    const stateId = await upsertId(
      db,
      `INSERT INTO states (profile_id, text, body, hash) VALUES ($1, $2, $3, $4)
       ON CONFLICT (profile_id, hash) DO UPDATE SET hash = EXCLUDED.hash RETURNING id`,
      [profileId, st.text, st.body, hash(req.state)],
    );

    // The request itself.
    const created = rec.started_at ? new Date(rec.started_at) : new Date();
    const requestId = await upsertId(
      db,
      `INSERT INTO requests (profile_id, created_at, model_req, state_id, decision_id, started_at, latency_ms,
                             user_id, group_id, sdk, context_added)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [profileId, created, req.model ?? "jev-latest", stateId, rec.id, created, rec.latency_ms ?? null,
       rec.user_id ?? null, rec.group_id ?? null, rec.sdk ?? null, Boolean(context)],
    );

    for (const tag of new Set(rec.tags ?? [])) {
      await db.query("INSERT INTO request_tags (profile_id, request_id, tag) VALUES ($1, $2, $3)", [profileId, requestId, tag]);
    }

    // Raw bodies, kept as a backup and for the "raw JSON" view.
    await db.query("INSERT INTO blob_req (profile_id, req_id, body, succeeded) VALUES ($1, $2, $3, $4)", [
      profileId, requestId, JSON.stringify(req), ok,
    ]);
    if (rec.response != null) {
      await db.query("INSERT INTO blob_response (profile_id, req_id, body) VALUES ($1, $2, $3)", [
        profileId, requestId, JSON.stringify(rec.response),
      ]);
    }
    await db.query(
      `INSERT INTO responses (profile_id, request_id, received_at, status_code, latency_ms, model_used,
                              input_tokens, output_tokens, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [profileId, requestId, created, rec.status, rec.latency_ms != null ? Math.round(rec.latency_ms) : null,
       ok ? res.model ?? null : null, res.usage?.input_tokens ?? null, res.usage?.output_tokens ?? null, rec.error ?? null],
    );

    // Each question: instructions (deduped), version (deduped), criteria, and its answer.
    for (const [key, q] of Object.entries(req.questions)) {
      const ins = textOrBody(q.instructions);
      const instructionId = await upsertId(
        db,
        `INSERT INTO instructions (profile_id, text, body, hash) VALUES ($1, $2, $3, $4)
         ON CONFLICT (profile_id, hash) DO UPDATE SET hash = EXCLUDED.hash RETURNING id`,
        [profileId, ins.text, ins.body, hash(q.instructions)],
      );

      const versionHash = hash({ key, type: q.type, instructions: q.instructions, criteria: q.criteria ?? null });
      const found = await db.query<{ id: string }>(
        "SELECT id FROM question_versions WHERE profile_id = $1 AND hash = $2",
        [profileId, versionHash],
      );
      let versionId = found.rows[0]?.id;
      const criterionIds = new Map<string, string>();
      if (!versionId) {
        versionId = await upsertId(
          db,
          `INSERT INTO question_versions (profile_id, question_key, type, instruction_id, hash)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [profileId, key, q.type, instructionId, versionHash],
        );
        for (const [position, c] of criteriaRows(q).entries()) {
          const v = c.value === null ? { text: null, body: null } : textOrBody(c.value);
          const id = await upsertId(
            db,
            `INSERT INTO criteria (profile_id, question_version_id, position, option_key, text, body)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [profileId, versionId, position, c.key, v.text, v.body],
          );
          criterionIds.set(c.key, id);
        }
      } else {
        const rows = await db.query<{ id: string; option_key: string }>(
          "SELECT id, option_key FROM criteria WHERE profile_id = $1 AND question_version_id = $2",
          [profileId, versionId],
        );
        for (const r of rows.rows) criterionIds.set(r.option_key, r.id);
      }

      await db.query("INSERT INTO request_questions (profile_id, request_id, question_version_id) VALUES ($1, $2, $3)", [
        profileId, requestId, versionId,
      ]);

      const a = res.answers?.[key];
      if (!ok || !a) continue;
      const answerId = await upsertId(
        db,
        `INSERT INTO answers (profile_id, request_id, question_version_id, type) VALUES ($1, $2, $3, $4) RETURNING id`,
        [profileId, requestId, versionId, a.type],
      );
      if (a.type === "noul") {
        await db.query("INSERT INTO noul_answers (profile_id, answer_id, noul) VALUES ($1, $2, $3)", [profileId, answerId, a.noul]);
      } else if (a.type === "choice") {
        const chosen = criterionIds.get(a.choice ?? "");
        if (chosen) {
          await db.query(
            "INSERT INTO choice_answers (profile_id, answer_id, chosen_criterion_id, confidence) VALUES ($1, $2, $3, $4)",
            [profileId, answerId, chosen, a.confidence ?? 0],
          );
        }
      } else if (a.type === "score") {
        await db.query("INSERT INTO score_answers (profile_id, answer_id, score, confidence) VALUES ($1, $2, $3, $4)", [
          profileId, answerId, a.score, a.confidence ?? 0,
        ]);
      }
      for (const [optionKey, p] of Object.entries(a.probabilities ?? {})) {
        const criterionId = criterionIds.get(optionKey);
        if (!criterionId) continue;
        await db.query(
          "INSERT INTO answer_probabilities (profile_id, answer_id, criterion_id, probability) VALUES ($1, $2, $3, $4)",
          [profileId, answerId, criterionId, p],
        );
      }
    }

    if (context) {
      await db.query(
        `INSERT INTO context (profile_id, request_id, source, example_set, body) VALUES ($1, $2, $3, $4, $5)`,
        [profileId, requestId, context.source ?? "retrieval", context.example_set ?? null, JSON.stringify(context.body)],
      );
    }

    await db.query("COMMIT");
    return requestId;
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  } finally {
    db.release();
  }
}

// ─────────────────────────────────────────────────────────────────────
// Read: the decisions list
// ─────────────────────────────────────────────────────────────────────

export type DecisionFilters = {
  q?: string; // free text: question key, instructions, state, chosen option, user
  group?: string;
  user?: string;
  type?: QuestionType | "error";
  tag?: string;
  context?: "yes" | "no";
  status?: "ok" | "error";
  minConf?: number; // 0..1
  maxConf?: number;
  sinceHours?: number | null; // only calls from the last N hours (null/undefined = all time)
};

// One row per answer (or one row for a failed call, which has no answers).
export type DecisionRow = {
  answerId: string | null;
  requestId: string;
  createdAt: Date;
  groupId: string | null;
  userId: string | null;
  contextAdded: boolean;
  questionKey: string | null;
  instruction: string | null;
  type: QuestionType | "error";
  noul: number | null;
  choice: string | null;
  score: number | null;
  levels: number | null;
  // Jev's confidence for choice/score. Nouls have none, so we show certainty: max(p, 1 - p).
  confidence: number | null;
  status: number | null;
  tags: string[];
};

export const PAGE_SIZE = 50;

// The rows every explorer query works on: one per answer, or one per failed call.
const FROM = `
  FROM requests r
  JOIN states s              ON s.id = r.state_id
  LEFT JOIN responses resp   ON resp.request_id = r.id
  LEFT JOIN answers a        ON a.request_id = r.id AND a.profile_id = r.profile_id
  LEFT JOIN question_versions qv ON qv.id = a.question_version_id
  LEFT JOIN instructions i   ON i.id = qv.instruction_id
  LEFT JOIN noul_answers na  ON na.answer_id = a.id
  LEFT JOIN choice_answers ca ON ca.answer_id = a.id
  LEFT JOIN criteria cc      ON cc.id = ca.chosen_criterion_id
  LEFT JOIN score_answers sa ON sa.answer_id = a.id`;
const CONF = "COALESCE(ca.confidence, sa.confidence, GREATEST(na.noul, 1 - na.noul))";

// WHERE clause + params for a filter set. Always starts with the profile, so no query
// built here can ever see another profile's rows. `skip` leaves one filter out (facet counts).
function buildWhere(profileId: string, f: DecisionFilters, skip?: keyof DecisionFilters) {
  const where: string[] = ["r.profile_id = $1"];
  const params: unknown[] = [profileId];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const use = (k: keyof DecisionFilters) => k !== skip && f[k] != null && f[k] !== "";

  if (use("group")) where.push(`r.group_id = ${p(f.group)}`);
  if (use("user")) where.push(`r.user_id = ${p(f.user)}`);
  if (use("tag")) where.push(`EXISTS (SELECT 1 FROM request_tags t WHERE t.request_id = r.id AND t.tag = ${p(f.tag)})`);
  if (use("context")) where.push(f.context === "yes" ? "r.context_added" : "NOT r.context_added");
  if (use("status")) where.push(f.status === "error" ? "COALESCE(resp.status_code, 0) <> 200" : "resp.status_code = 200");
  if (use("type")) where.push(f.type === "error" ? "a.id IS NULL" : `a.type = ${p(f.type)}`);
  if (use("minConf")) where.push(`${CONF} >= ${p(f.minConf)}`);
  if (use("maxConf")) where.push(`${CONF} < ${p(f.maxConf)}`);
  if (use("sinceHours")) where.push(`r.created_at >= now() - make_interval(hours => ${p(f.sinceHours)})`);
  if (use("q")) {
    const n = p(`%${f.q}%`); // one parameter, used in every column we search
    where.push(`(qv.question_key ILIKE ${n} OR i.text ILIKE ${n} OR s.text ILIKE ${n}
                 OR cc.option_key ILIKE ${n} OR r.user_id ILIKE ${n} OR r.group_id ILIKE ${n})`);
  }
  return { where: where.join(" AND "), params };
}

export async function listDecisions(
  profileId: string,
  f: DecisionFilters,
  page = 1,
): Promise<{ rows: DecisionRow[]; hasMore: boolean; total: number }> {
  const { where, params } = buildWhere(profileId, f);
  const n = params.length;
  const sql = `
    SELECT a.id AS answer_id, r.id AS request_id, r.created_at, r.group_id, r.user_id, r.context_added,
           qv.question_key, COALESCE(i.text, i.body->>'question', i.body::text) AS instruction,
           COALESCE(a.type::text, 'error') AS type,
           na.noul, cc.option_key AS choice, sa.score,
           (SELECT count(*)::int FROM criteria c2 WHERE c2.question_version_id = qv.id) AS levels,
           ${CONF} AS confidence, resp.status_code AS status,
           ARRAY(SELECT t.tag FROM request_tags t WHERE t.request_id = r.id ORDER BY t.tag) AS tags,
           count(*) OVER () AS total
    ${FROM}
    WHERE ${where}
    ORDER BY r.created_at DESC, qv.question_key
    LIMIT $${n + 1} OFFSET $${n + 2}`;

  const r = await pool.query(sql, [...params, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE]);
  const rows: DecisionRow[] = r.rows.slice(0, PAGE_SIZE).map((x) => ({
    answerId: x.answer_id,
    requestId: x.request_id,
    createdAt: x.created_at,
    groupId: x.group_id,
    userId: x.user_id,
    contextAdded: x.context_added,
    questionKey: x.question_key,
    instruction: x.instruction,
    type: x.type,
    noul: x.noul,
    choice: x.choice,
    score: x.score,
    levels: x.levels,
    confidence: x.confidence,
    status: x.status,
    tags: x.tags ?? [],
  }));
  const total = r.rows[0] ? Number(r.rows[0].total) : 0;
  return { rows, hasMore: r.rows.length > PAGE_SIZE, total };
}

// Facet sidebar: for each facet, its values and how many rows each would give.
// Each facet is counted with every OTHER filter applied (like Datadog), so picking a
// group still shows the other groups you could switch to.
export type FacetCounts = Record<"group" | "user" | "type" | "tag" | "context" | "status", { value: string; count: number }[]>;

export async function facetCounts(profileId: string, f: DecisionFilters): Promise<FacetCounts> {
  const facet = async (skip: keyof DecisionFilters, expr: string, joinTags = false) => {
    const { where, params } = buildWhere(profileId, f, skip);
    const r = await pool.query<{ value: string; count: string }>(
      `SELECT ${expr} AS value, count(*) AS count
       ${FROM} ${joinTags ? "JOIN request_tags tg ON tg.request_id = r.id" : ""}
       WHERE ${where} AND ${expr} IS NOT NULL
       GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12`,
      params,
    );
    return r.rows.map((x) => ({ value: x.value, count: Number(x.count) }));
  };
  const [group, user, type, tag, context, status] = await Promise.all([
    facet("group", "r.group_id"),
    facet("user", "r.user_id"),
    facet("type", "COALESCE(a.type::text, 'error')"),
    facet("tag", "tg.tag", true),
    facet("context", "CASE WHEN r.context_added THEN 'yes' ELSE 'no' END"),
    facet("status", "CASE WHEN resp.status_code = 200 THEN 'ok' ELSE 'error' END"),
  ]);
  return { group, user, type, tag, context, status };
}

// Volume over time for the histogram: rows per time bucket, split into ok / error.
export type Bucket = { start: Date; ok: number; error: number };

export async function volumeHistogram(profileId: string, f: DecisionFilters, buckets = 48): Promise<Bucket[]> {
  const { where, params } = buildWhere(profileId, f);
  const n = params.length;
  // Range: the selected window, or (all time) from the first matching call until now.
  const r = await pool.query<{ start: Date; ok: string; error: string }>(
    `WITH rows AS (SELECT r.created_at, COALESCE(resp.status_code, 0) = 200 AS ok ${FROM} WHERE ${where}),
          bounds AS (
            SELECT COALESCE(now() - make_interval(hours => $${n + 1}::int), (SELECT min(created_at) FROM rows), now() - interval '1 day') AS lo,
                   now() AS hi
          ),
          grid AS (
            SELECT lo + (hi - lo) * g / $${n + 2} AS start, lo + (hi - lo) * (g + 1) / $${n + 2} AS stop
            FROM bounds, generate_series(0, $${n + 2} - 1) g
          )
     SELECT grid.start,
            count(*) FILTER (WHERE rows.ok) AS ok,
            count(*) FILTER (WHERE rows.created_at IS NOT NULL AND NOT rows.ok) AS error
     FROM grid LEFT JOIN rows ON rows.created_at >= grid.start AND rows.created_at < grid.stop
     GROUP BY grid.start ORDER BY grid.start`,
    [...params, f.sinceHours ?? null, buckets],
  );
  return r.rows.map((x) => ({ start: x.start, ok: Number(x.ok), error: Number(x.error) }));
}

// ─────────────────────────────────────────────────────────────────────
// Read: one decision in full
// ─────────────────────────────────────────────────────────────────────

export type DecisionDetail = {
  id: string;
  decisionId: string | null;
  createdAt: Date;
  latencyMs: number | null;
  modelRequested: string;
  modelUsed: string | null;
  status: number | null;
  error: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  userId: string | null;
  groupId: string | null;
  sdk: string | null;
  tags: string[];
  state: Json;
  context: { id: string; source: string; exampleSet: string | null; body: Json; createdAt: Date } | null;
  questions: {
    key: string;
    type: QuestionType;
    instructions: Json;
    criteria: { key: string; description: Json }[];
    answer: {
      noul: number | null;
      choice: string | null;
      score: number | null;
      confidence: number | null;
      probabilities: Record<string, number>;
    } | null;
  }[];
  rawRequest: Json;
  rawResponse: Json;
};

// Returns null when the id doesn't exist or belongs to another profile.
export async function getDecision(profileId: string, requestId: string): Promise<DecisionDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return null;

  const head = await pool.query(
    `SELECT r.*, s.body AS state_json, s.text AS state_text,
            resp.status_code, resp.error_message, resp.model_used, resp.input_tokens, resp.output_tokens,
            br.body AS raw_request, bs.body AS raw_response
     FROM requests r
     JOIN states s ON s.id = r.state_id
     LEFT JOIN responses resp ON resp.request_id = r.id
     LEFT JOIN blob_req br ON br.req_id = r.id
     LEFT JOIN blob_response bs ON bs.req_id = r.id
     WHERE r.profile_id = $1 AND r.id = $2`,
    [profileId, requestId],
  ).catch(() => null);
  const h = head?.rows[0];
  if (!h) return null;

  const [tags, ctx, qs] = await Promise.all([
    pool.query<{ tag: string }>("SELECT tag FROM request_tags WHERE profile_id = $1 AND request_id = $2 ORDER BY tag", [profileId, requestId]),
    pool.query("SELECT * FROM context WHERE profile_id = $1 AND request_id = $2", [profileId, requestId]),
    pool.query(
      `SELECT qv.id AS qv_id, qv.question_key, qv.type, COALESCE(to_jsonb(i.text), i.body) AS instructions,
              a.id AS answer_id, na.noul, cc.option_key AS choice, sa.score,
              COALESCE(ca.confidence, sa.confidence) AS confidence
       FROM request_questions rq
       JOIN question_versions qv ON qv.id = rq.question_version_id
       JOIN instructions i ON i.id = qv.instruction_id
       LEFT JOIN answers a ON a.request_id = rq.request_id AND a.question_version_id = qv.id
       LEFT JOIN noul_answers na ON na.answer_id = a.id
       LEFT JOIN choice_answers ca ON ca.answer_id = a.id
       LEFT JOIN criteria cc ON cc.id = ca.chosen_criterion_id
       LEFT JOIN score_answers sa ON sa.answer_id = a.id
       WHERE rq.profile_id = $1 AND rq.request_id = $2
       ORDER BY qv.question_key`,
      [profileId, requestId],
    ),
  ]);

  const questions: DecisionDetail["questions"] = [];
  for (const q of qs.rows) {
    const [crit, probs] = await Promise.all([
      pool.query(
        `SELECT option_key, COALESCE(to_jsonb(text), body) AS description FROM criteria
         WHERE profile_id = $1 AND question_version_id = $2 ORDER BY position`,
        [profileId, q.qv_id],
      ),
      q.answer_id
        ? pool.query(
            `SELECT c.option_key, ap.probability FROM answer_probabilities ap
             JOIN criteria c ON c.id = ap.criterion_id
             WHERE ap.profile_id = $1 AND ap.answer_id = $2 ORDER BY c.position`,
            [profileId, q.answer_id],
          )
        : Promise.resolve({ rows: [] as { option_key: string; probability: number }[] }),
    ]);
    questions.push({
      key: q.question_key,
      type: q.type,
      instructions: q.instructions,
      criteria: crit.rows.map((c) => ({ key: c.option_key, description: c.description })),
      answer: q.answer_id
        ? {
            noul: q.noul,
            choice: q.choice,
            score: q.score,
            confidence: q.confidence,
            probabilities: Object.fromEntries(probs.rows.map((p) => [p.option_key, p.probability])),
          }
        : null,
    });
  }

  const c = ctx.rows[0];
  return {
    id: h.id,
    decisionId: h.decision_id,
    createdAt: h.created_at,
    latencyMs: h.latency_ms,
    modelRequested: h.model_req,
    modelUsed: h.model_used,
    status: h.status_code,
    error: h.error_message,
    inputTokens: h.input_tokens,
    outputTokens: h.output_tokens,
    userId: h.user_id,
    groupId: h.group_id,
    sdk: h.sdk,
    tags: tags.rows.map((t) => t.tag),
    state: h.state_text ?? h.state_json,
    context: c ? { id: c.id, source: c.source, exampleSet: c.example_set, body: c.body, createdAt: c.created_at } : null,
    questions,
    rawRequest: h.raw_request,
    rawResponse: h.raw_response,
  };
}
