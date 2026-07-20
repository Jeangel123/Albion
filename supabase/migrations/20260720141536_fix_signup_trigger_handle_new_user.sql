/*
# Fix signup "Database error" — broken handle_new_user trigger

## Root cause
The `handle_new_user()` trigger fires AFTER INSERT ON auth.users to auto-create
a profile row. It inserted into columns `(id, username, full_name)`, but the
`profiles` table has NO `full_name` column — the column is `display_name`. The
invalid column reference raised an exception inside the trigger, which aborted
the auth.users INSERT and surfaced to the client as a generic "Database error".

A second issue: the trigger read `NEW.raw_user_meta_data->>'username'` for the
username, but the frontend sent `display_name` in user metadata (not `username`),
so the coalesce fell back to the email prefix and the chosen username was lost.

## Changes
1. Recreate `handle_new_user()` to insert into the correct columns
   `(id, username, display_name)` and read both `username` and `display_name`
   from user metadata.
2. Add `SET search_path = public` to the function for security (search_path
   hardening) and keep SECURITY DEFINER so the insert bypasses RLS during the
   auth flow (the new user has no session yet).
3. No data is lost; no tables or columns are dropped. The trigger is replaced
   in place.

## Frontend companion change
The frontend signUp must send `username` (not just `display_name`) in
options.data so the trigger can read it. The redundant post-signup
`profiles.update({ username })` is removed — it ran without a session and was
silently blocked by RLS.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'display_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Trigger is already attached; no need to drop/recreate it.
