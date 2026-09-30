-- JevDB ownership: every data row belongs to one profile.
-- See notes/db-schema.md.
--
-- Why every table (not just `requests`): it gives RLS (row-level security, planned)
-- one simple rule for all tables, `profile_id = current profile`, with no joins.
-- It must exist before there is data: adding a required column later means
-- working out the owner of every old row.
--
-- App side: query these tables only through withProfile() in web/lib/db.ts,
-- which sets `app.current_profile_id` for the transaction. RLS policies will read it.
--
-- Deleting a profile deletes all of its data (ON DELETE CASCADE).

-- ── Owner column on every data table ────────────────────────────────

-- Input side (0001)
ALTER TABLE blob_req           ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE states             ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE requests           ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE instructions       ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE question_versions  ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE criteria           ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE request_questions  ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;

-- Response side (0002)
ALTER TABLE blob_response         ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE responses             ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE answers               ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE noul_answers          ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE choice_answers        ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE score_answers         ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE answer_probabilities  ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;
ALTER TABLE grades                ADD COLUMN profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE;

-- ── Dedup per profile, not globally ─────────────────────────────────

-- Before: one row per hash for everyone, so two profiles sending the same
-- state would share a row (a leak, and a clash with RLS). Now: per profile.
ALTER TABLE states             DROP CONSTRAINT states_hash_key;
ALTER TABLE instructions       DROP CONSTRAINT instructions_hash_key;
ALTER TABLE question_versions  DROP CONSTRAINT question_versions_hash_key;
ALTER TABLE states             ADD UNIQUE (profile_id, hash);
ALTER TABLE instructions       ADD UNIQUE (profile_id, hash);
ALTER TABLE question_versions  ADD UNIQUE (profile_id, hash);

-- ── Indexes ─────────────────────────────────────────────────────────

-- The dashboard's main query: "my requests, newest first".
CREATE INDEX requests_profile_created_idx ON requests (profile_id, created_at DESC);

-- One per table so filtering by profile (and cascading a profile delete) stays fast.
-- states / instructions / question_versions are covered by their (profile_id, hash) unique index.
CREATE INDEX blob_req_profile_idx              ON blob_req (profile_id);
CREATE INDEX criteria_profile_idx              ON criteria (profile_id);
CREATE INDEX request_questions_profile_idx     ON request_questions (profile_id);
CREATE INDEX blob_response_profile_idx         ON blob_response (profile_id);
CREATE INDEX responses_profile_idx             ON responses (profile_id);
CREATE INDEX answers_profile_idx               ON answers (profile_id);
CREATE INDEX noul_answers_profile_idx          ON noul_answers (profile_id);
CREATE INDEX choice_answers_profile_idx        ON choice_answers (profile_id);
CREATE INDEX score_answers_profile_idx         ON score_answers (profile_id);
CREATE INDEX answer_probabilities_profile_idx  ON answer_probabilities (profile_id);
CREATE INDEX grades_profile_idx                ON grades (profile_id);
