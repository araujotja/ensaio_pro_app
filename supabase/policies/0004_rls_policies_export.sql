-- =============================================================================
-- RLS POLICIES — Ensaio Pro
-- Derivadas da análise do código-fonte em 28/06/2026.
--
-- VERIFICAÇÃO OBRIGATÓRIA: antes de usar em produção, execute no Supabase SQL
-- Editor e compare com este arquivo:
--
--   SELECT
--     'CREATE POLICY "' || policyname || '" ON ' || tablename ||
--     ' FOR ' || cmd ||
--     ' TO ' || roles::text ||
--     CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
--     CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END ||
--     ';' as policy_sql
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
--
-- Este arquivo é idempotente (DROP IF EXISTS antes de cada CREATE).
-- =============================================================================

-- ── Helper functions ──────────────────────────────────────────────────────────

-- Checks if the current user is a member of the given group
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM membership
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

-- Checks if the current user is a core leader of the given group
-- (admin_org, admin_grupo, maestro, lider_louvor)
CREATE OR REPLACE FUNCTION is_group_leader(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM membership
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND role IN ('admin_org', 'admin_grupo', 'maestro', 'lider_louvor')
  );
$$;

-- Checks if the current user is a reviewer (leader + lider_naipe + spalla)
CREATE OR REPLACE FUNCTION is_group_reviewer(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM membership
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND role IN (
        'admin_org', 'admin_grupo', 'maestro', 'lider_louvor',
        'lider_naipe', 'spalla'
      )
  );
$$;

-- ── organization ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "org: members read" ON organization;
CREATE POLICY "org: members read" ON organization
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_group ag
      JOIN membership m ON m.group_id = ag.id
      WHERE ag.organization_id = organization.id
        AND m.user_id = auth.uid()
    )
  );

-- ── app_group ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "group: members read" ON app_group;
CREATE POLICY "group: members read" ON app_group
  FOR SELECT TO authenticated
  USING (is_group_member(id));

-- ── nucleus ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "nucleus: members read" ON nucleus;
CREATE POLICY "nucleus: members read" ON nucleus
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

-- ── category ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "category: members read" ON category;
CREATE POLICY "category: members read" ON category
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

-- ── profile ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profile: members read" ON profile;
CREATE POLICY "profile: members read" ON profile
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM membership m1
      JOIN membership m2 ON m1.group_id = m2.group_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = profile.id
    )
  );

DROP POLICY IF EXISTS "profile: own update" ON profile;
CREATE POLICY "profile: own update" ON profile
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── membership ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "membership: group members read" ON membership;
CREATE POLICY "membership: group members read" ON membership
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

-- ── repertoire ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "repertoire: members read" ON repertoire;
CREATE POLICY "repertoire: members read" ON repertoire
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS "repertoire: members insert" ON repertoire;
CREATE POLICY "repertoire: members insert" ON repertoire
  FOR INSERT TO authenticated
  WITH CHECK (is_group_leader(group_id));

-- ── section ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "section: members read" ON section;
CREATE POLICY "section: members read" ON section
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM repertoire r
      WHERE r.id = section.repertoire_id
        AND is_group_member(r.group_id)
    )
  );

DROP POLICY IF EXISTS "section: leaders insert" ON section;
CREATE POLICY "section: leaders insert" ON section
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM repertoire r
      WHERE r.id = section.repertoire_id
        AND is_group_leader(r.group_id)
    )
  );

-- ── repertoire_part ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "repertoire_part: members read" ON repertoire_part;
CREATE POLICY "repertoire_part: members read" ON repertoire_part
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM repertoire r
      WHERE r.id = repertoire_part.repertoire_id
        AND is_group_member(r.group_id)
    )
  );

-- ── track ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "track: members read" ON track;
CREATE POLICY "track: members read" ON track
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM repertoire r
      WHERE r.id = track.repertoire_id
        AND is_group_member(r.group_id)
    )
  );

-- ── task ──────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "task: members read" ON task;
CREATE POLICY "task: members read" ON task
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS "task: members insert" ON task;
CREATE POLICY "task: members insert" ON task
  FOR INSERT TO authenticated
  WITH CHECK (
    is_group_leader(group_id)
    AND created_by = auth.uid()
  );

-- Only leaders/reviewers may update task status (e.g., 'ativo' → 'encerrado').
-- Submission status changes go through the service role and don't need this policy.
DROP POLICY IF EXISTS "task: members update status" ON task;
CREATE POLICY "task: members update status" ON task
  FOR UPDATE TO authenticated
  USING (is_group_reviewer(group_id))
  WITH CHECK (is_group_reviewer(group_id));

-- ── submission ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "submission: members read" ON submission;
CREATE POLICY "submission: members read" ON submission
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task t
      WHERE t.id = submission.task_id
        AND is_group_member(t.group_id)
    )
  );

DROP POLICY IF EXISTS "submission: own insert" ON submission;
CREATE POLICY "submission: own insert" ON submission
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM task t
      WHERE t.id = submission.task_id
        AND is_group_member(t.group_id)
    )
  );

-- ── feedback ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "feedback: members read" ON feedback;
CREATE POLICY "feedback: members read" ON feedback
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM submission s
      JOIN task t ON t.id = s.task_id
      WHERE s.id = feedback.submission_id
        AND is_group_member(t.group_id)
    )
  );

DROP POLICY IF EXISTS "feedback: reviewers insert" ON feedback;
CREATE POLICY "feedback: reviewers insert" ON feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM submission s
      JOIN task t ON t.id = s.task_id
      WHERE s.id = feedback.submission_id
        AND is_group_reviewer(t.group_id)
    )
  );

-- ── readiness_state ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "readiness_state: members read" ON readiness_state;
CREATE POLICY "readiness_state: members read" ON readiness_state
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM repertoire r
      WHERE r.id = readiness_state.repertoire_id
        AND is_group_member(r.group_id)
    )
  );

-- Readiness upserts go through the service client; these policies are
-- defensive backups for any future direct-client writes.
DROP POLICY IF EXISTS "readiness_state: own insert" ON readiness_state;
CREATE POLICY "readiness_state: own insert" ON readiness_state
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "readiness_state: own update" ON readiness_state;
CREATE POLICY "readiness_state: own update" ON readiness_state
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── community_post ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "community_post: members read" ON community_post;
CREATE POLICY "community_post: members read" ON community_post
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS "community_post: members insert" ON community_post;
CREATE POLICY "community_post: members insert" ON community_post
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_group_member(group_id)
  );

-- ── community_reply ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "community_reply: members read" ON community_reply;
CREATE POLICY "community_reply: members read" ON community_reply
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_post cp
      WHERE cp.id = community_reply.post_id
        AND is_group_member(cp.group_id)
    )
  );

DROP POLICY IF EXISTS "community_reply: members insert" ON community_reply;
CREATE POLICY "community_reply: members insert" ON community_reply
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM community_post cp
      WHERE cp.id = community_reply.post_id
        AND is_group_member(cp.group_id)
    )
  );

-- ── xp_event ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "xp_event: members read" ON xp_event;
CREATE POLICY "xp_event: members read" ON xp_event
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

-- ── development_track ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "development_track: members read" ON development_track;
CREATE POLICY "development_track: members read" ON development_track
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

-- ── rehearsal ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "rehearsal: members read" ON rehearsal;
CREATE POLICY "rehearsal: members read" ON rehearsal
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

-- ── audit_log, access_log, invitation ────────────────────────────────────────
-- No SELECT/INSERT/UPDATE/DELETE policies for authenticated users.
-- All access goes through the service role (bypasses RLS).
-- RLS enabled + no policies = deny all non-service access.
