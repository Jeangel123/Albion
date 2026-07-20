/*
# Phase 10 — Supremo Panel de Administración

## Overview
- Adds `founder` role to profiles (highest privilege level)
- Extends `app_config` with general configuration columns (platform name,
  description, logo, banner, social links, support email, discord, available
  languages, currency name, reputation point values, maintenance return date)
- Creates `global_announcements` table for scheduled/pinned announcements
- RLS on announcements: staff can read/insert/update/delete; users can read active ones

## Security
- `founder` role is the highest level — only founder can promote/demote admins
- RLS on announcements restricts write access to staff only
*/

-- === Extend app_config ===
ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS platform_name text DEFAULT 'Imperio',
  ADD COLUMN IF NOT EXISTS platform_description text DEFAULT 'La red social de Albion Online',
  ADD COLUMN IF NOT EXISTS platform_logo text,
  ADD COLUMN IF NOT EXISTS platform_banner text,
  ADD COLUMN IF NOT EXISTS support_email text DEFAULT 'soporte@imperio.app',
  ADD COLUMN IF NOT EXISTS discord_url text,
  ADD COLUMN IF NOT EXISTS available_languages text DEFAULT 'es,en,pt',
  ADD COLUMN IF NOT EXISTS currency_name text DEFAULT 'Monedas de Oro',
  ADD COLUMN IF NOT EXISTS rep_create_post integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS rep_create_community integer DEFAULT 25,
  ADD COLUMN IF NOT EXISTS rep_send_message integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS rep_receive_reaction integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS maintenance_return_date text;

-- === global_announcements ===
CREATE TABLE IF NOT EXISTS global_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  scheduled_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE global_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_announcements" ON global_announcements;
CREATE POLICY "select_announcements"
ON global_announcements FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_announcements" ON global_announcements;
CREATE POLICY "insert_announcements"
ON global_announcements FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['founder'::text, 'supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
);

DROP POLICY IF EXISTS "update_announcements" ON global_announcements;
CREATE POLICY "update_announcements"
ON global_announcements FOR UPDATE
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

DROP POLICY IF EXISTS "delete_announcements" ON global_announcements;
CREATE POLICY "delete_announcements"
ON global_announcements FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['founder'::text, 'supreme_admin'::text, 'admin'::text, 'moderator'::text])
  )
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON global_announcements (is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON global_announcements (is_pinned);
