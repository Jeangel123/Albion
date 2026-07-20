/*
# Fix chat delivery: chat_room_members UPDATE policy + user_frames SELECT for equipped frames

## Problem
1. `chat_room_members` had no UPDATE policy. The GlobalChat page uses `.upsert()` to
   ensure the current user is a member of the global room. When the row already exists,
   upsert issues an UPDATE, which RLS silently blocked. The page loaded (ready=true)
   but the user never gained membership, so the `messages` SELECT policy
   (which requires a matching `chat_room_members` row) returned 0 rows — the chat
   appeared empty even though messages existed.

2. `user_frames` SELECT policy was `auth.uid() = user_id`, so the ChatPanel's nested
   join `sender:profiles(..., frame:user_frames!user_frames(...))` could only resolve
   the current user's own frames. Other users' equipped frames were filtered out by
   RLS, returning null (cosmetic issue — avatars with frames didn't render for others).

## Changes
1. `chat_room_members`: add UPDATE policy allowing a user to update their own
   membership rows (`auth.uid() = user_id`). This makes upsert idempotent.
2. `user_frames`: relax SELECT to allow reading any row where `is_equipped = true`
   (so equipped frames are visible to everyone for display), while keeping
   ownership-only access for unequipped frames (inventory privacy).

## Security
- A user can only UPDATE their own membership rows (no privilege escalation).
- A user can only SELECT equipped frames of others (their inventory of unequipped
  frames stays private).
- No data is lost; no columns or tables are dropped or renamed.
*/

-- 1. chat_room_members: add UPDATE policy for own rows
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_room_members_update_own" ON chat_room_members;
CREATE POLICY "chat_room_members_update_own"
  ON chat_room_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. user_frames: allow SELECT of equipped frames by anyone, own rows always
ALTER TABLE user_frames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_uf" ON user_frames;
CREATE POLICY "select_uf"
  ON user_frames FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_equipped = true);