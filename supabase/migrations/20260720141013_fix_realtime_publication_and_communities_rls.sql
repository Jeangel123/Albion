/*
# Publish missing tables to realtime + fix communities SELECT policy

## Problem
Several pages subscribe to realtime changes on tables that were never added to
the `supabase_realtime` publication. Those subscriptions silently fail — the
channel subscribes but never receives events, so data never updates in real time.
Additionally, the `communities` SELECT policy was scoped to `authenticated`
only, so logged-out users browsing /comunidades saw an empty list (while
guilds/posts/comments were readable by anon).

## Changes
1. Realtime: add the following tables to the `supabase_realtime` publication
   so `useRealtime` subscriptions on them actually deliver events:
   - user_frames
   - reputation_log
   - wallets
   - transactions
   - suggestions
   - notifications
   - reactions
   - comments
   - follows
   - guild_members
   - events
   - alliances
   - alliance_members
2. RLS: replace the `communities` SELECT policy so `anon` can also read
   communities (browsing the directory without login is intended), matching
   the pattern already used by guilds, posts, comments, reactions, etc.

## Security
- The communities SELECT policy change only widens READ access to anon. Write
  policies (insert/update/delete) remain `authenticated` with ownership checks.
- No data is lost; no columns or tables are dropped.
*/

-- 1. Publish tables to realtime so useRealtime subscriptions receive events.
--    alter publication ... add table is idempotent-safe via DO block.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_frames;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reputation_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.guild_members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.alliances;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.alliance_members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. communities SELECT: allow anon to read the directory (matches guilds/posts).
DROP POLICY IF EXISTS "select_communities" ON communities;
CREATE POLICY "select_communities" ON communities FOR SELECT
  TO anon, authenticated USING (true);
