-- Performance indexes for queries not covered by the initial migration.
-- All use IF NOT EXISTS so this migration is safe to re-run.

-- submission(user_id): used in upload rate-limit check and readiness computation
CREATE INDEX IF NOT EXISTS submission_user_id_idx
  ON submission(user_id);

-- task(repertoire_id): used in readiness aggregation (count tasks per repertoire)
CREATE INDEX IF NOT EXISTS task_repertoire_id_idx
  ON task(repertoire_id);

-- feedback(submission_id): FK join used in readiness computation and RLS policy
CREATE INDEX IF NOT EXISTS feedback_submission_id_idx
  ON feedback(submission_id);

-- feedback(type): used in count queries filtering by 'aprovado'
CREATE INDEX IF NOT EXISTS feedback_type_idx
  ON feedback(type);

-- audit_log(user_id, action, created_at): used in all DB-based rate limit checks
CREATE INDEX IF NOT EXISTS audit_log_rate_limit_idx
  ON audit_log(user_id, action, created_at);

-- invitation(created_by, created_at): used in invite rate-limit check
CREATE INDEX IF NOT EXISTS invitation_created_by_idx
  ON invitation(created_by, created_at);
