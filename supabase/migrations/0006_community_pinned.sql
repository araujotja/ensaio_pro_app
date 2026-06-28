-- 0006_community_pinned.sql
-- Adds pinned-post support to community_post.
-- Run in Supabase SQL Editor before using the community page.
ALTER TABLE community_post ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
