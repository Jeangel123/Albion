/*
# Fix messages RLS: allow community owners/admins to delete messages

1. Security Changes
- Replace the existing `messages_delete_own` policy with one that allows
  the message sender OR community owners/admins to delete messages.
- This enables moderation: community owners and admins can remove
  inappropriate messages from the community chat.
- The owner/admin check uses `community_members` table with role
  'owner' or 'admin', matching the community that owns the chat_room.
*/

DROP POLICY IF EXISTS "messages_delete_own" ON messages;
DROP POLICY IF EXISTS "messages_delete_own_or_admin" ON messages;

CREATE POLICY "messages_delete_own_or_admin" ON messages FOR DELETE
TO authenticated
USING (
  auth.uid() = sender_id
  OR EXISTS (
    SELECT 1 FROM chat_rooms r
    JOIN community_members cm ON cm.community_id = r.id
    WHERE r.id = messages.room_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('supreme_admin', 'admin', 'moderator')
  )
);