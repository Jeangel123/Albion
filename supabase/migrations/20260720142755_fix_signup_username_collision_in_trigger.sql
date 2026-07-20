/*
# Fix signup "Database error" — username unique constraint collision in trigger

## Root cause
The `profiles` table has a UNIQUE constraint on `username`. The `handle_new_user()`
trigger inserts the username from user metadata (or falls back to the email prefix
via split_part). If a new user picks a username that already exists, OR if two
users have the same email prefix (e.g. two "john@gmail.com" signups both get
"john"), the trigger raises a unique_violation. The `ON CONFLICT (id) DO NOTHING`
only handles primary key (id) conflicts, NOT username conflicts.

The unique_violation aborts the entire signup transaction → "Database error".

## Fix
1. Make handle_new_user append a numeric suffix to the username if it collides,
   guaranteeing uniqueness without failing the signup.
2. Wrap the profile insert in a BEGIN/EXCEPTION block so that even if something
   unexpected happens, the signup never fails — the profile can be repaired
   later. This is critical: a trigger failure on auth.users aborts the user
   creation entirely, locking the user out.
3. Keep the wallet trigger non-fatal (already done in previous migration).
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_username text;
  v_base text;
  v_suffix int := 0;
  v_final text;
BEGIN
  v_username := coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  v_base := v_username;
  v_final := v_username;

  -- Resolve username collisions by appending a numeric suffix. This guarantees
  -- the unique constraint on profiles.username is never violated by the trigger.
  LOOP
    SELECT INTO v_final v_base || CASE WHEN v_suffix = 0 THEN '' ELSE '_' || v_suffix END;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = v_final);
    v_suffix := v_suffix + 1;
    -- Safety valve: avoid infinite loop
    IF v_suffix > 9999 THEN
      v_final := v_base || '_' || NEW.id::text;
      EXIT;
    END IF;
  END LOOP;

  BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (NEW.id, v_final, NEW.raw_user_meta_data->>'display_name')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Never let a profile-creation failure abort the signup. The auth.users row
    -- is the critical record; the profile can be repaired later.
    RAISE WARNING 'handle_new_user failed for user %: % %', NEW.id, SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
