-- JevDB response side: what Jev sent back, plus grading.
-- Raw blob + fully structured decomposition. See notes/db-schema.md.

-- ── Blob ────────────────────────────────────────────────────────────

-- Exact response body from Jev. Backup; droppable via retention.
CREATE TABLE blob_response (
  req_id  UUID PRIMARY KEY REFERENCES requests(id) ON DELETE CASCADE,
  body    JSONB NOT NULL
);

-- ── Structured ──────────────────────────────────────────────────────

-- One row per Jev response (success or error).
CREATE TABLE responses (
  request_id     UUID PRIMARY KEY REFERENCES requests(id) ON DELETE CASCADE,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_code    INT NOT NULL,
  latency_ms     INT,
  model_used     TEXT,              -- e.g. jev-1.13.0 (NULL on error)
  input_tokens   INT,
  output_tokens  INT,
  error_message  TEXT               -- set when status_code != 200
);

-- Base row for every answer. Grades point here.
CREATE TABLE answers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id           UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  question_version_id  UUID NOT NULL REFERENCES question_versions(id),
  type                 question_type NOT NULL,
  UNIQUE (request_id, question_version_id)
);

CREATE TABLE noul_answers (
  answer_id  UUID PRIMARY KEY REFERENCES answers(id) ON DELETE CASCADE,
  noul       REAL NOT NULL          -- 0 = no, 1 = yes
);

CREATE TABLE choice_answers (
  answer_id            UUID PRIMARY KEY REFERENCES answers(id) ON DELETE CASCADE,
  chosen_criterion_id  UUID NOT NULL REFERENCES criteria(id),
  confidence           REAL NOT NULL
);

-- `legend` from the response = criteria rows (option_key -> text).
CREATE TABLE score_answers (
  answer_id   UUID PRIMARY KEY REFERENCES answers(id) ON DELETE CASCADE,
  score       REAL NOT NULL,         -- can land between levels
  confidence  REAL NOT NULL
);

-- Probability per option/level (choice + score).
CREATE TABLE answer_probabilities (
  answer_id     UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  criterion_id  UUID NOT NULL REFERENCES criteria(id),
  probability   REAL NOT NULL,
  PRIMARY KEY (answer_id, criterion_id)
);

-- ── Grading ─────────────────────────────────────────────────────────

CREATE TABLE grades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id   UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  outcome     TEXT NOT NULL CHECK (outcome IN ('good', 'bad')),
  source      TEXT,                   -- e.g. ticket_resolved
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────────

CREATE INDEX answers_request_id_idx        ON answers (request_id);
CREATE INDEX answers_qv_id_idx             ON answers (question_version_id);
CREATE INDEX choice_answers_confidence_idx ON choice_answers (confidence);
CREATE INDEX score_answers_confidence_idx  ON score_answers (confidence);
CREATE INDEX answer_probs_criterion_idx    ON answer_probabilities (criterion_id);
CREATE INDEX grades_answer_id_idx          ON grades (answer_id);
