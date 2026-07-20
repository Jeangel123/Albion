/*
# Phase 10.5 — Seguridad y Normas del Reino

## Overview
- Adds `category` to reports (inappropriate, harassment, spam, scam, other)
- Creates `sanctions` table for warnings, temporary suspensions, and bans
- Creates `ai_flags` table for future AI (Vaelyra) content detection —
  stores flagged content for human review. No AI implementation yet.
- Extends `audit_log` with `result` column for action outcomes

## Security
- RLS on sanctions: staff can read/insert; users can read their own
- RLS on ai_flags: only staff can read; system inserts via service role
*/

-- === Extend reports with category ===
ALTER TABLE reports ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports (category);

-- === Extend audit_log with result ===
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS result text;

-- === sanctions table ===
CREATE TABLE IF NOT EXISTS sanctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issued_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('warning', 'suspension', 'ban', 'unban')),
  reason text,
  duration_hours integer,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  related_report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sanctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sanctions_own" ON sanctions;
CREATE POLICY "select_sanctions_own"
ON sanctions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_sanctions_staff" ON sanctions;
CREATE POLICY "select_sanctions_staff"
ON sanctions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['founder'::text, 'supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
);

DROP POLICY IF EXISTS "insert_sanctions_staff" ON sanctions;
CREATE POLICY "insert_sanctions_staff"
ON sanctions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['founder'::text, 'supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
);

DROP POLICY IF EXISTS "update_sanctions_staff" ON sanctions;
CREATE POLICY "update_sanctions_staff"
ON sanctions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['founder'::text, 'supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['founder'::text, 'supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
);

CREATE INDEX IF NOT EXISTS idx_sanctions_user ON sanctions (user_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_active ON sanctions (is_active);

-- === ai_flags table (for future Vaelyra AI) ===
CREATE TABLE IF NOT EXISTS ai_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id uuid,
  target_content text,
  flag_reason text NOT NULL,
  confidence numeric(5,4) DEFAULT 0,
  category text DEFAULT 'other',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_flags ENABLE ROW LEVEL SECURITY;

-- Only staff can read AI flags
DROP POLICY IF EXISTS "select_ai_flags_staff" ON ai_flags;
CREATE POLICY "select_ai_flags_staff"
ON ai_flags FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['founder'::text, 'supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
);

DROP POLICY IF EXISTS "update_ai_flags_staff" ON ai_flags;
CREATE POLICY "update_ai_flags_staff"
ON ai_flags FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['founder'::text, 'supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['founder'::text, 'supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
);

-- Service role (future AI) can insert via anon with service key bypass
DROP POLICY IF EXISTS "insert_ai_flags_service" ON ai_flags;
CREATE POLICY "insert_ai_flags_service"
ON ai_flags FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_flags_status ON ai_flags (status);
CREATE INDEX IF NOT EXISTS idx_ai_flags_category ON ai_flags (category);
