-- DecisionDB auth: who can log into the dashboard.
-- Owned by Better Auth (config: web/lib/auth.ts). Generated with
--   bunx @better-auth/cli generate --config lib/auth.ts --output ../db/migrations/0003_auth.sql
-- then formatted. If you change auth.ts (plugins, providers), regenerate instead of hand-editing.
--
-- Naming: Better Auth's "user" is our `profile` (and `profile_id` in foreign keys).
-- Better Auth's own columns keep its camelCase names, so they need "quotes" in SQL.

-- ── Profiles ────────────────────────────────────────────────────────

-- One row per person who can log in. Later tables (projects, API keys) point here.
CREATE TABLE profile (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  "emailVerified"  BOOLEAN NOT NULL,
  image            TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Sessions ────────────────────────────────────────────────────────

-- One row per logged-in browser. The session cookie holds `token`.
CREATE TABLE session (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "expiresAt"   TIMESTAMPTZ NOT NULL,
  token         TEXT NOT NULL UNIQUE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  "ipAddress"   TEXT,
  "userAgent"   TEXT,
  profile_id    UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE
);

-- ── Login methods ───────────────────────────────────────────────────

-- One row per way a profile can log in: "credential" (email + password,
-- `password` holds the hash, never the plain text), "github", "google".
CREATE TABLE account (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "accountId"               TEXT NOT NULL,
  "providerId"              TEXT NOT NULL,
  profile_id                UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  "accessToken"             TEXT,
  "refreshToken"            TEXT,
  "idToken"                 TEXT,
  "accessTokenExpiresAt"    TIMESTAMPTZ,
  "refreshTokenExpiresAt"   TIMESTAMPTZ,
  scope                     TEXT,
  password                  TEXT,
  "createdAt"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"               TIMESTAMPTZ NOT NULL
);

-- Short-lived codes (email verification, password reset, OAuth state).
CREATE TABLE verification (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier    TEXT NOT NULL,
  value         TEXT NOT NULL,
  "expiresAt"   TIMESTAMPTZ NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────────

CREATE INDEX session_profile_id_idx       ON session (profile_id);
CREATE INDEX account_profile_id_idx       ON account (profile_id);
CREATE INDEX verification_identifier_idx  ON verification (identifier);
