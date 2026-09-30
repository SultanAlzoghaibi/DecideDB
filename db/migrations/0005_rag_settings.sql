-- JevDB: retrieval (RAG) settings, one row per group per profile.
-- No row = retrieval off for that group (the default).
--   mode: automatic = best-graded past decisions, custom = hand-picked examples, both.
--   automatic picks decisions in the same group, sharing the call's tags when same_tags,
--   with a grade score >= min_score, highest first, at most max_examples.

CREATE TABLE rag_settings (
  profile_id    UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  group_id      TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT false,
  mode          TEXT NOT NULL DEFAULT 'automatic' CHECK (mode IN ('automatic', 'custom', 'both')),
  min_score     REAL NOT NULL DEFAULT 0.8 CHECK (min_score BETWEEN 0 AND 1),
  same_tags     BOOLEAN NOT NULL DEFAULT true,
  max_examples  INTEGER NOT NULL DEFAULT 3 CHECK (max_examples BETWEEN 1 AND 10),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, group_id)
);
