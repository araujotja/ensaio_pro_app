-- 0002_membership_profile_fk.sql
-- Adiciona FK direto de membership.user_id → profile(id) para que
-- PostgREST consiga resolver o relacionamento via schema cache.
-- Requer que profile seja inserido antes de membership (garantido pelo onboarding).

ALTER TABLE membership
  ADD CONSTRAINT membership_user_id_profile_fkey
  FOREIGN KEY (user_id) REFERENCES profile(id) ON DELETE CASCADE;
