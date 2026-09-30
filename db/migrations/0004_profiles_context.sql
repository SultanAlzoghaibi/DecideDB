-- JevDB: every decision belongs to a profile, plus caller info, tags and added context.
--
-- 1. Every data table gets `profile_id`, so every query can (and must) filter by the
--    logged-in profile. It sits on child tables too (answers, probabilities, ...), so a
--    later Row Level Security policy can check each table directly.
-- 2. Deduped tables (states, instructions, question_versions) dedupe per profile:
--    one profile's text is never shared with another's.
-- 3. requests gets what the SDK sends about the call: decision id, timing, user, group.
-- 4. request_tags: any number of free labels per call.
-- 5. context: when JevDB auto-adds context to a call (retrieval examples), the exact
--    context is stored here and requests.context_added is set.

-- ── 1. profile_id everywhere ───────────────────────────────────────

ALTER TABLE states               ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE requests             ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE instructions         ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE question_versions    ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE criteria             ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE request_questions    ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE blob_req             ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE blob_response        ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE responses            ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE answers              ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE noul_answers         ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE choice_answers       ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE score_answers        ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE answer_probabilities ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE grades               ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;

-- ── 2. dedupe per profile ──────────────────────────────────────────

ALTER TABLE states            DROP CONSTRAINT states_hash_key,            ADD UNIQUE (profile_id, hash);
ALTER TABLE instructions      DROP CONSTRAINT instructions_hash_key,      ADD UNIQUE (profile_id, hash);
ALTER TABLE question_versions DROP CONSTRAINT question_versions_hash_key, ADD UNIQUE (profile_id, hash);

-- ── 3. what the SDK sends about the call ───────────────────────────

ALTER TABLE requests
  ADD COLUMN decision_id    TEXT,          -- SDK-generated id, or your own (e.g. a ticket id)
  ADD COLUMN started_at     TIMESTAMPTZ,   -- when the Jev call started (client clock)
  ADD COLUMN latency_ms     REAL,
  ADD COLUMN user_id        TEXT,          -- who triggered the call (your id)
  ADD COLUMN group_id       TEXT,          -- feature / team / app
  ADD COLUMN sdk            TEXT,          -- e.g. jevdb-python/0.2.0
  ADD COLUMN context_added  BOOLEAN NOT NULL DEFAULT false,  -- true exactly when a `context` row exists
  ADD UNIQUE (profile_id, decision_id);    -- a retried send can't create a duplicate

-- Connection errors and timeouts have no HTTP status.
ALTER TABLE responses ALTER COLUMN status_code DROP NOT NULL;

-- ── 4. tags ────────────────────────────────────────────────────────

CREATE TABLE request_tags (
  profile_id  UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  PRIMARY KEY (request_id, tag)
);

-- ── 5. context JevDB added to a call ───────────────────────────────

CREATE TABLE context (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  request_id   UUID NOT NULL UNIQUE REFERENCES requests(id) ON DELETE CASCADE,
  source       TEXT NOT NULL DEFAULT 'retrieval',  -- what added it (retrieval for now)
  example_set  TEXT,                               -- which cached example set, e.g. tone@v12
  body         JSONB NOT NULL,                     -- exactly what was added to the request
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes (every dashboard query starts with profile_id) ─────────

CREATE INDEX requests_profile_created_idx ON requests (profile_id, created_at DESC);
CREATE INDEX requests_profile_group_idx   ON requests (profile_id, group_id);
CREATE INDEX requests_profile_user_idx    ON requests (profile_id, user_id);
CREATE INDEX answers_profile_type_idx     ON answers (profile_id, type);
CREATE INDEX request_tags_profile_tag_idx ON request_tags (profile_id, tag);
