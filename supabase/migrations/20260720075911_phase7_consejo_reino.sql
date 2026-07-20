/*
# Phase 7 — Consejo del Reino: community feedback system

## Overview
Creates a suggestion/feedback system where users can submit ideas, vote on them,
and admins can moderate and update their status. Notifications are sent when
a suggestion changes status.

## Tables
- suggestions: user-submitted ideas with title, description, category, image, status
- suggestion_votes: simple upvote system (one vote per user per suggestion)

## RLS
- Suggestions: anyone can read; authenticated users can insert their own;
  admins/mods can update status; owners can delete their own.
- Votes: anyone can read; authenticated users can insert/delete their own vote.
*/

-- === suggestions ===
CREATE TABLE IF NOT EXISTS suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'otro',
  image_url text,
  status text NOT NULL DEFAULT 'pendiente',
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_suggestions" ON suggestions;
CREATE POLICY "select_suggestions"
ON suggestions FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_suggestions" ON suggestions;
CREATE POLICY "insert_suggestions"
ON suggestions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "update_suggestions" ON suggestions;
CREATE POLICY "update_suggestions"
ON suggestions FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
)
WITH CHECK (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
);

DROP POLICY IF EXISTS "delete_suggestions" ON suggestions;
CREATE POLICY "delete_suggestions"
ON suggestions FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
);

-- === suggestion_votes ===
CREATE TABLE IF NOT EXISTS suggestion_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, user_id)
);

ALTER TABLE suggestion_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_suggestion_votes" ON suggestion_votes;
CREATE POLICY "select_suggestion_votes"
ON suggestion_votes FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_suggestion_votes" ON suggestion_votes;
CREATE POLICY "insert_suggestion_votes"
ON suggestion_votes FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_suggestion_votes" ON suggestion_votes;
CREATE POLICY "delete_suggestion_votes"
ON suggestion_votes FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Index for sorting by votes
CREATE INDEX IF NOT EXISTS idx_suggestions_vote_count ON suggestions (vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions (status);
CREATE INDEX IF NOT EXISTS idx_suggestion_votes_suggestion ON suggestion_votes (suggestion_id);
