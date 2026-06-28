-- 0001_rls_policies.sql

-- ============================================================
-- Helper functions (SECURITY DEFINER — run as table owner)
-- ============================================================

CREATE OR REPLACE FUNCTION is_group_member(gid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM membership
    WHERE group_id = gid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION role_in_group(gid UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM membership
  WHERE group_id = gid AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_group_leader(gid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM membership
    WHERE group_id = gid
      AND user_id = auth.uid()
      AND role IN ('admin_org','admin_grupo','maestro','lider_louvor')
  );
$$;

CREATE OR REPLACE FUNCTION is_nucleus_leader(gid UUID, nid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM membership
    WHERE group_id = gid
      AND user_id = auth.uid()
      AND is_lider_naipe = true
      AND nucleus_id = nid
  );
$$;

CREATE OR REPLACE FUNCTION user_nucleus(gid UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT nucleus_id FROM membership
  WHERE group_id = gid AND user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- organization
-- ============================================================

CREATE POLICY "org_select" ON organization
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_group g
      JOIN membership m ON m.group_id = g.id
      WHERE g.organization_id = organization.id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "org_insert_admin" ON organization
  FOR INSERT WITH CHECK (true); -- restricted via service role in practice

CREATE POLICY "org_update_admin" ON organization
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM app_group g
      JOIN membership m ON m.group_id = g.id
      WHERE g.organization_id = organization.id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin_org','admin_grupo')
    )
  );

-- ============================================================
-- app_group
-- ============================================================

CREATE POLICY "group_select" ON app_group
  FOR SELECT USING (is_group_member(id));

CREATE POLICY "group_update_admin" ON app_group
  FOR UPDATE USING (is_group_leader(id));

-- ============================================================
-- nucleus
-- ============================================================

CREATE POLICY "nucleus_select" ON nucleus
  FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "nucleus_manage" ON nucleus
  FOR ALL USING (is_group_leader(group_id));

-- ============================================================
-- category
-- ============================================================

CREATE POLICY "category_select" ON category
  FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "category_manage" ON category
  FOR ALL USING (is_group_leader(group_id));

-- ============================================================
-- profile
-- ============================================================

CREATE POLICY "profile_select_own" ON profile
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profile_select_group_member" ON profile
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM membership m1
      JOIN membership m2 ON m2.group_id = m1.group_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = profile.id
    )
  );

CREATE POLICY "profile_upsert_own" ON profile
  FOR ALL USING (id = auth.uid());

-- ============================================================
-- membership
-- ============================================================

CREATE POLICY "membership_select" ON membership
  FOR SELECT USING (
    user_id = auth.uid() OR is_group_member(group_id)
  );

CREATE POLICY "membership_manage_leader" ON membership
  FOR ALL USING (is_group_leader(group_id));

-- ============================================================
-- repertoire
-- ============================================================

CREATE POLICY "repertoire_select" ON repertoire
  FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "repertoire_manage" ON repertoire
  FOR ALL USING (is_group_leader(group_id));

-- ============================================================
-- section
-- ============================================================

CREATE POLICY "section_select" ON section
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM repertoire r WHERE r.id = section.repertoire_id AND is_group_member(r.group_id))
  );

CREATE POLICY "section_manage" ON section
  FOR ALL USING (
    EXISTS (SELECT 1 FROM repertoire r WHERE r.id = section.repertoire_id AND is_group_leader(r.group_id))
  );

-- ============================================================
-- repertoire_part  ← ANTI-PIRACY: nucleus-scoped access
-- ============================================================

CREATE POLICY "part_select" ON repertoire_part
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repertoire r WHERE r.id = repertoire_part.repertoire_id
      AND (
        is_group_leader(r.group_id)
        OR repertoire_part.nucleus_id IS NULL
        OR repertoire_part.nucleus_id = user_nucleus(r.group_id)
        OR is_nucleus_leader(r.group_id, repertoire_part.nucleus_id)
      )
    )
  );

CREATE POLICY "part_manage" ON repertoire_part
  FOR ALL USING (
    EXISTS (SELECT 1 FROM repertoire r WHERE r.id = repertoire_part.repertoire_id AND is_group_leader(r.group_id))
  );

-- ============================================================
-- track
-- ============================================================

CREATE POLICY "track_select" ON track
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM repertoire r WHERE r.id = track.repertoire_id AND is_group_member(r.group_id))
  );

CREATE POLICY "track_manage" ON track
  FOR ALL USING (
    EXISTS (SELECT 1 FROM repertoire r WHERE r.id = track.repertoire_id AND is_group_leader(r.group_id))
  );

-- ============================================================
-- task
-- ============================================================

CREATE POLICY "task_select" ON task
  FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "task_manage" ON task
  FOR ALL USING (is_group_leader(group_id));

-- ============================================================
-- submission
-- ============================================================

CREATE POLICY "submission_select_own" ON submission
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "submission_select_leader" ON submission
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM task t WHERE t.id = submission.task_id AND is_group_leader(t.group_id))
  );

CREATE POLICY "submission_insert_own" ON submission
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "submission_update_own" ON submission
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- feedback
-- Líder de naipe pode aprovar envios do seu naipe (delegação)
-- ============================================================

CREATE POLICY "feedback_select" ON feedback
  FOR SELECT USING (
    reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM submission s
      JOIN task t ON t.id = s.task_id
      WHERE s.id = feedback.submission_id
        AND (s.user_id = auth.uid() OR is_group_leader(t.group_id))
    )
  );

CREATE POLICY "feedback_insert_leader" ON feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM submission s
      JOIN task t ON t.id = s.task_id
      JOIN membership m ON m.group_id = t.group_id AND m.user_id = auth.uid()
      WHERE s.id = feedback.submission_id
        AND (
          m.role IN ('admin_org','admin_grupo','maestro','lider_louvor')
          OR (m.is_lider_naipe = true AND EXISTS (
            SELECT 1 FROM membership sm
            WHERE sm.user_id = s.user_id
              AND sm.group_id = t.group_id
              AND sm.nucleus_id = m.nucleus_id
          ))
        )
    )
  );

-- ============================================================
-- readiness_state
-- ============================================================

CREATE POLICY "readiness_select_own" ON readiness_state
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "readiness_select_leader" ON readiness_state
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repertoire r WHERE r.id = readiness_state.repertoire_id AND is_group_leader(r.group_id)
    )
  );

-- Writes handled by service role only

-- ============================================================
-- community_post
-- ============================================================

CREATE POLICY "post_select" ON community_post
  FOR SELECT USING (
    is_group_member(group_id)
    AND (nucleus_id IS NULL OR nucleus_id = user_nucleus(group_id) OR is_group_leader(group_id))
  );

CREATE POLICY "post_insert" ON community_post
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_group_member(group_id));

CREATE POLICY "post_delete_own" ON community_post
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- community_reply
-- ============================================================

CREATE POLICY "reply_select" ON community_reply
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM community_post p WHERE p.id = community_reply.post_id AND is_group_member(p.group_id))
  );

CREATE POLICY "reply_insert" ON community_reply
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "reply_delete_own" ON community_reply
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- xp_event
-- ============================================================

CREATE POLICY "xp_select_own" ON xp_event
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "xp_select_leader" ON xp_event
  FOR SELECT USING (is_group_leader(group_id));

-- ============================================================
-- development_track
-- ============================================================

CREATE POLICY "devtrack_own" ON development_track
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "devtrack_leader" ON development_track
  FOR SELECT USING (is_group_leader(group_id));

-- ============================================================
-- rehearsal
-- ============================================================

CREATE POLICY "rehearsal_select" ON rehearsal
  FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "rehearsal_manage" ON rehearsal
  FOR ALL USING (is_group_leader(group_id));

-- ============================================================
-- audit_log  (service role writes; admins read)
-- ============================================================

CREATE POLICY "audit_select_admin" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM membership m WHERE m.user_id = auth.uid() AND m.role IN ('admin_org','admin_grupo')
    )
  );

-- ============================================================
-- access_log  (service role writes; user reads own)
-- ============================================================

CREATE POLICY "access_select_own" ON access_log
  FOR SELECT USING (user_id = auth.uid());
