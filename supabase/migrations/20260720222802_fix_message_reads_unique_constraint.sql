/*
# Fix message_reads unique constraint for NULL columns

## Problem
The unique constraint `uniq_message_reads_user_scope` on `(user_id, guild_id, room_id)`
does NOT work when `guild_id` or `room_id` is NULL. PostgreSQL treats NULL as distinct
in unique constraints, so `ON CONFLICT (user_id, guild_id, room_id)` never matches for
global chat (where guild_id IS NULL) or guild chat (where room_id IS NULL).

This means every `markRead()` call inserts a duplicate row instead of updating the
existing one. The `message_reads` table accumulates junk rows, and the upsert silently
fails to do its job.

## Fix
1. Drop the broken unique constraint.
2. Clean up existing duplicate rows (keep the most recent per scope).
3. Create two partial unique indexes that work with NULL:
   - One for global chat (where guild_id IS NULL) on (user_id, room_id)
   - One for guild chat (where room_id IS NULL) on (user_id, guild_id)
4. Update the frontend `onConflict` to use the correct constraint per scope.

## Security
No security impact — this only fixes data integrity for read tracking.
*/

-- 1. Drop the broken constraint
DROP INDEX IF EXISTS uniq_message_reads_user_scope;

-- 2. Clean up existing duplicates for global scope (guild_id IS NULL)
DELETE FROM message_reads
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, room_id
        ORDER BY last_read_at DESC
      ) as rn
    FROM message_reads
    WHERE guild_id IS NULL
  ) t WHERE rn > 1
);

-- 3. Clean up duplicates for guild scope (room_id IS NULL)
DELETE FROM message_reads
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, guild_id
        ORDER BY last_read_at DESC
      ) as rn
    FROM message_reads
    WHERE room_id IS NULL
  ) t WHERE rn > 1
);

-- 4. Create partial unique indexes that work with NULL
CREATE UNIQUE INDEX IF NOT EXISTS uniq_message_reads_global
  ON message_reads (user_id, room_id)
  WHERE guild_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_message_reads_guild
  ON message_reads (user_id, guild_id)
  WHERE room_id IS NULL;