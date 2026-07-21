/*
# Whispers — Sistema de mensajes privados (1 a 1)

## Descripción
Crea un sistema de "whispers" (mensajes privados) entre dos usuarios.
Incluye confirmación de lectura (read receipts), reacciones y soporte para respuestas (reply_to).

## Nuevas tablas

### 1. `whispers`
- `id` (uuid, PK)
- `sender_id` (uuid, FK → profiles, NOT NULL DEFAULT auth.uid())
- `recipient_id` (uuid, FK → profiles, NOT NULL)
- `content` (text)
- `media_url` (text)
- `reply_to` (uuid, FK → whispers ON DELETE SET NULL)
- `read_at` (timestamptz) — NULL = no leído
- `created_at` (timestamptz, DEFAULT now())

### 2. `whisper_reactions`
- `id` (uuid, PK)
- `whisper_id` (uuid, FK → whispers ON DELETE CASCADE)
- `user_id` (uuid, FK → profiles)
- `type` (text)
- `created_at` (timestamptz)
- UNIQUE(whisper_id, user_id, type)

## Seguridad (RLS)
- whispers: SELECT solo sender/recipient; INSERT solo sender; UPDATE solo recipient; DELETE sender o recipient.
- whisper_reactions: SELECT para participantes; INSERT/DELETE solo el usuario que reacciona.
*/

CREATE TABLE IF NOT EXISTS whispers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  media_url text,
  reply_to uuid REFERENCES whispers(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whisper_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whisper_id uuid NOT NULL REFERENCES whispers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (whisper_id, user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_whispers_participants
  ON whispers (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whispers_recipient_unread
  ON whispers (recipient_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_whisper_reactions_whisper
  ON whisper_reactions (whisper_id);

ALTER TABLE whispers ENABLE ROW LEVEL SECURITY;
ALTER TABLE whisper_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_whispers" ON whispers;
CREATE POLICY "select_own_whispers" ON whispers FOR SELECT
  TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "insert_own_whispers" ON whispers;
CREATE POLICY "insert_own_whispers" ON whispers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "update_own_whispers_read" ON whispers;
CREATE POLICY "update_own_whispers_read" ON whispers FOR UPDATE
  TO authenticated USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "delete_own_whispers" ON whispers;
CREATE POLICY "delete_own_whispers" ON whispers FOR DELETE
  TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "select_whisper_reactions_participants" ON whisper_reactions;
CREATE POLICY "select_whisper_reactions_participants" ON whisper_reactions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM whispers w
      WHERE w.id = whisper_id
      AND (w.sender_id = auth.uid() OR w.recipient_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_whisper_reactions_own" ON whisper_reactions;
CREATE POLICY "insert_whisper_reactions_own" ON whisper_reactions FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM whispers w
      WHERE w.id = whisper_id
      AND (w.sender_id = sender_id OR w.recipient_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_whisper_reactions_own" ON whisper_reactions;
CREATE POLICY "delete_whisper_reactions_own" ON whisper_reactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whispers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whispers;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'whisper_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE whisper_reactions;
  END IF;
END $$;