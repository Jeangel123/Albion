/*
# Enable Supabase Realtime on profiles, guilds, posts

1. Purpose
- Allow the frontend to subscribe to INSERT/UPDATE/DELETE events on
  `profiles`, `guilds`, and `posts` so changes appear without reloading.

2. Changes
- Add `profiles`, `guilds`, `posts` to the `supabase_realtime` publication.
- Idempotent: uses `publication_add_tables` with a check to avoid duplicates.

3. Security
- No RLS or policy changes. Realtime respects existing RLS policies —
  clients only receive events for rows they are allowed to see.

4. Notes
- This only enables realtime broadcasting; it does not alter table schema.
- Safe to re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'guilds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guilds;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
END $$;
