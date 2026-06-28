-- Invitation tokens for musician invite flow.
-- All DML goes through service role; no user-level RLS policies needed.
-- RLS enabled with no policies = deny all direct user access.

CREATE TABLE invitation (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES app_group(id) ON DELETE CASCADE,
  role        app_role    NOT NULL,
  email       TEXT        NOT NULL,
  token_hash  TEXT        NOT NULL UNIQUE,   -- SHA-256(token), token stays client-side
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX invitation_token_hash_idx ON invitation (token_hash);
CREATE INDEX invitation_group_id_idx   ON invitation (group_id);

ALTER TABLE invitation ENABLE ROW LEVEL SECURITY;
-- No policies → only service role can read/write
