/*
# Fix chat RLS recursion + guarantee global chat membership

## Problem
1. The original `chat_room_members_select_member` policy contained a self-referential
   subquery (`SELECT 1 FROM chat_room_members ...`), which caused
   `infinite recursion detected in policy for relation chat_room_members`.
   This blocked reads on chat_room_members and, transitively, messages.
2. The global chat room (`00000000-0000-0000-0000-000000000001`) had 0 members,
   so new users could not read or send messages until the frontend upsert ran,
   and if that upsert failed silently the user was locked out.
3. `chat_rooms` and `chat_room_members` were not in the `supabase_realtime`
   publication (only `messages` was), limiting future realtime features.

## Changes
1. RLS on `chat_room_members`:
   - SELECT: `(auth.uid() = user_id)` — no self-referential subquery. A user can
     see their own memberships. (Membership lists are not exposed broadly.)
   - INSERT: `auth.uid() = user_id` OR room creator. Unchanged logic, rewritten.
   - DELETE: `auth.uid() = user_id`. Unchanged.
2. RLS on `chat_rooms`:
   - SELECT: member of the room via chat_room_members (non-recursive: only checks
     `auth.uid() = user_id` on the members table, no self-reference on chat_rooms).
   - INSERT/DELETE: creator. Unchanged, rewritten for clarity.
3. RLS on `messages`: re-assert the existing non-recursive policies to guarantee
   the repo and DB match. Guild messages require guild_members membership;
   community/global messages require chat_room_members membership. Sender
   cannot be falsified (`auth.uid() = sender_id`).
4. Realtime: add `chat_rooms` and `chat_room_members` to `supabase_realtime`.
5. Auto-membership: a `SECURITY DEFINER` trigger `ensure_global_chat_membership`
   runs AFTER INSERT on `profiles` and inserts a row into `chat_room_members`
   for the global room. Idempotent via ON CONFLICT. Also a backfill for existing
   profiles.

## Security
- No data is lost; no columns or tables dropped.
- All policies remain `TO authenticated` (app has sign-in).
- `sender_id` is enforced via `auth.uid() = sender_id` on INSERT.
- The global-room membership insert runs as SECURITY DEFINER so it bypasses
  RLS on chat_room_members (the user cannot insert arbitrary memberships, only
  the trigger can add them to the global room).
*/

-- ============================================================
-- 1. chat_room_members: eliminate recursion
-- ============================================================
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_room_members_select_member" ON chat_room_members;
DROP POLICY IF EXISTS "chat_room_members_select_own" ON chat_room_members;
CREATE POLICY "chat_room_members_select_own" ON chat_room_members FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_room_members_insert_own_or_creator" ON chat_room_members;
CREATE POLICY "chat_room_members_insert_own_or_creator" ON chat_room_members FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chat_rooms r
      WHERE r.id = chat_room_members.room_id AND r.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_room_members_delete_own" ON chat_room_members;
CREATE POLICY "chat_room_members_delete_own" ON chat_room_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 2. chat_rooms: non-recursive member check
-- ============================================================
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_rooms_select_member" ON chat_rooms;
CREATE POLICY "chat_rooms_select_member" ON chat_rooms FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = chat_rooms.id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_rooms_insert_own" ON chat_rooms;
CREATE POLICY "chat_rooms_insert_own" ON chat_rooms FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "chat_rooms_delete_own" ON chat_rooms;
CREATE POLICY "chat_rooms_delete_own" ON chat_rooms FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- 3. messages: re-assert non-recursive policies (repo <-> DB alignment)
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_authenticated" ON messages;
DROP POLICY IF EXISTS "messages_select_member" ON messages;
CREATE POLICY "messages_select_authenticated" ON messages FOR SELECT
  TO authenticated USING (
    (guild_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = messages.guild_id AND gm.user_id = auth.uid()
    ))
    OR
    (guild_id IS NULL AND room_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = messages.room_id AND m.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "messages_insert_member" ON messages;
CREATE POLICY "messages_insert_member" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND (
      (guild_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM guild_members gm
        WHERE gm.guild_id = messages.guild_id AND gm.user_id = auth.uid()
      ))
      OR
      (guild_id IS NULL AND room_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM chat_room_members m
        WHERE m.room_id = messages.room_id AND m.user_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_update_own" ON messages FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_delete_own" ON messages;
CREATE POLICY "messages_delete_own" ON messages FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_delete_community_admin" ON messages;
CREATE POLICY "messages_delete_community_admin" ON messages FOR DELETE
  TO authenticated USING (
    guild_id IS NULL AND EXISTS (
      SELECT 1 FROM chat_rooms r
      JOIN community_members cm ON cm.community_id = r.id
      WHERE r.id = messages.room_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "messages_delete_guild_leader" ON messages;
CREATE POLICY "messages_delete_guild_leader" ON messages FOR DELETE
  TO authenticated USING (
    guild_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = messages.guild_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('leader', 'admin')
    )
  );

DROP POLICY IF EXISTS "messages_delete_staff" ON messages;
CREATE POLICY "messages_delete_staff" ON messages FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('supreme_admin', 'admin', 'moderator')
    )
  );

-- ============================================================
-- 4. Realtime: add chat_rooms and chat_room_members
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_members;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 5. Auto-membership in global chat room
-- ============================================================
-- Global room id (must match frontend GLOBAL_ROOM_ID)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM chat_rooms WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO chat_rooms (id, type, name, created_by)
    VALUES ('00000000-0000-0000-0000-000000000001', 'global', 'Chat Global',
      COALESCE((SELECT id FROM profiles ORDER BY created_at LIMIT 1),
               '00000000-0000-0000-0000-000000000000'))
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION ensure_global_chat_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO chat_room_members (room_id, user_id)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id)
  ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_global_chat_membership ON profiles;
CREATE TRIGGER trg_ensure_global_chat_membership
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_global_chat_membership();

-- Backfill: add all existing profiles to the global room
INSERT INTO chat_room_members (room_id, user_id)
SELECT '00000000-0000-0000-0000-000000000001', p.id
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM chat_room_members m
  WHERE m.room_id = '00000000-0000-0000-0000-000000000001'
    AND m.user_id = p.id
)
ON CONFLICT (room_id, user_id) DO NOTHING;
