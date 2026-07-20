/*
# Phase 9 — Contact messages table

## Overview
Stores messages sent via the contact form. Allows both authenticated and
anonymous users to send messages to the admin team.

## RLS
- Anyone can insert (the form is public)
- Only admins can read (to respond to messages)
*/

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subject text NOT NULL,
  message text NOT NULL,
  is_handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_contact_messages" ON contact_messages;
CREATE POLICY "insert_contact_messages"
ON contact_messages FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_contact_messages" ON contact_messages;
CREATE POLICY "select_contact_messages"
ON contact_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['supreme_admin'::text, 'admin'::text])
  )
);
