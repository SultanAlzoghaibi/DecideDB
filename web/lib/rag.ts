// Retrieval (RAG) settings per group. Server-only; every query filters by profileId.
// Table: db/migrations/0005_rag_settings.sql. Docs: /docs/rag.
import { pool } from "@/lib/db";

export type RagMode = "automatic" | "custom" | "both";
export const RAG_MODES: RagMode[] = ["automatic", "custom", "both"];

export type RagSetting = {
  groupId: string;
  enabled: boolean;
  mode: RagMode;
  minScore: number;
  sameTags: boolean;
  maxExamples: number;
  calls: number; // how many logged calls this group has
};

export const RAG_DEFAULTS = { enabled: false, mode: "automatic" as RagMode, minScore: 0.8, sameTags: true, maxExamples: 3 };

// Every group the profile has logged calls for, or has settings for, with its settings
// (defaults when nothing is saved yet).
export async function listRagSettings(profileId: string): Promise<RagSetting[]> {
  const r = await pool.query(
    `WITH groups AS (
       SELECT group_id, count(*)::int AS calls FROM requests
       WHERE profile_id = $1 AND group_id IS NOT NULL GROUP BY group_id
     )
     SELECT coalesce(g.group_id, s.group_id) AS group_id, coalesce(g.calls, 0) AS calls,
            s.enabled, s.mode, s.min_score, s.same_tags, s.max_examples
     FROM groups g
     FULL JOIN (SELECT * FROM rag_settings WHERE profile_id = $1) s ON s.group_id = g.group_id
     ORDER BY 1`,
    [profileId],
  );
  return r.rows.map((row) => ({
    groupId: row.group_id,
    calls: row.calls,
    enabled: row.enabled ?? RAG_DEFAULTS.enabled,
    mode: row.mode ?? RAG_DEFAULTS.mode,
    minScore: row.min_score ?? RAG_DEFAULTS.minScore,
    sameTags: row.same_tags ?? RAG_DEFAULTS.sameTags,
    maxExamples: row.max_examples ?? RAG_DEFAULTS.maxExamples,
  }));
}

// Insert or update one group's settings.
export async function saveRagSetting(profileId: string, s: Omit<RagSetting, "calls">): Promise<void> {
  await pool.query(
    `INSERT INTO rag_settings (profile_id, group_id, enabled, mode, min_score, same_tags, max_examples)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (profile_id, group_id) DO UPDATE SET
       enabled = excluded.enabled, mode = excluded.mode, min_score = excluded.min_score,
       same_tags = excluded.same_tags, max_examples = excluded.max_examples, updated_at = now()`,
    [profileId, s.groupId, s.enabled, s.mode, s.minScore, s.sameTags, s.maxExamples],
  );
}

// One group's settings (defaults when nothing is saved), or null if the group doesn't exist.
export async function getRagSetting(profileId: string, groupId: string): Promise<RagSetting | null> {
  return (await listRagSettings(profileId)).find((s) => s.groupId === groupId) ?? null;
}
