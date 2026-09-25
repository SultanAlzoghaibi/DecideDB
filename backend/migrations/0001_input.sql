-- JevDB input side: what the user sent to Jev.
-- Raw blob + fully structured decomposition. See notes/db-schema.md.
-- Free-form content (state, instructions, criteria text) may be a string OR
-- structured JSON in Jev, so those rows have `text` (plain string) or `body`
-- (structured) — exactly one is set.

-- ── Blob ────────────────────────────────────────────────────────────

-- Exact request body as received (no auth header). Backup; droppable via retention.
-- req_id = requests.id (FK added below, once requests exists).
CREATE TABLE blob_req (
  req_id     UUID PRIMARY KEY,
  body       JSONB NOT NULL,
  succeeded  BOOLEAN            -- NULL = waiting on Jev, true = 2xx, false = error
);

-- ── Structured ──────────────────────────────────────────────────────

CREATE TYPE question_type AS ENUM ('noul', 'choice', 'score');

-- Unique states (deduped by hash; same ticket asked twice = 1 row).
CREATE TABLE states (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT,
  body        JSONB,
  hash        TEXT NOT NULL UNIQUE,
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((text IS NULL) <> (body IS NULL))
);

-- One row per Jev call.
CREATE TABLE requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_req   TEXT NOT NULL,            -- e.g. jev-latest
  state_id    UUID NOT NULL REFERENCES states(id)
);

-- Unique instruction wordings.
CREATE TABLE instructions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT,
  body        JSONB,
  hash        TEXT NOT NULL UNIQUE,
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((text IS NULL) <> (body IS NULL))
);

-- One row per unique question definition (key + type + instructions + criteria).
-- Change the wording or criteria -> new version.
CREATE TABLE question_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key    TEXT NOT NULL,        -- e.g. is_urgent
  type            question_type NOT NULL,
  instruction_id  UUID NOT NULL REFERENCES instructions(id),
  hash            TEXT NOT NULL UNIQUE,
  first_seen      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per option / level of a question version.
--   choice: option_key = option name ("billing"), text may be NULL
--   score:  option_key = level index ("0", "1", ...), position = level
--   noul:   option_key = "true" / "false" (optional criteria)
CREATE TABLE criteria (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_version_id  UUID NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
  position             INT NOT NULL,
  option_key           TEXT NOT NULL,
  text                 TEXT,
  body                 JSONB,
  CHECK (NOT (text IS NOT NULL AND body IS NOT NULL)),
  UNIQUE (question_version_id, option_key),
  UNIQUE (question_version_id, position)
);

-- Which questions were asked in a request.
CREATE TABLE request_questions (
  request_id           UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  question_version_id  UUID NOT NULL REFERENCES question_versions(id),
  PRIMARY KEY (request_id, question_version_id)
);

-- ── Links ───────────────────────────────────────────────────────────

ALTER TABLE blob_req
  ADD FOREIGN KEY (req_id) REFERENCES requests(id) ON DELETE CASCADE;

-- ── Indexes ─────────────────────────────────────────────────────────

CREATE INDEX requests_created_at_idx    ON requests (created_at DESC);
CREATE INDEX requests_state_id_idx      ON requests (state_id);
CREATE INDEX question_versions_key_idx  ON question_versions (question_key);
