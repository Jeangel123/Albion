/*
# Fix signup "Database error" — missing SET search_path on trigger functions

## Root cause
The `create_wallet_on_profile()` trigger fires AFTER INSERT ON profiles to
auto-create a wallet row. It is SECURITY DEFINER but has NO `SET search_path`.
Supabase GoTrue runs the auth.users insert (which fires handle_new_user, which
inserts into profiles, which fires create_wallet_on_profile) with a restricted
search_path. With no explicit search_path on the function, the unqualified
`wallets` table reference fails to resolve, the trigger raises an exception,
and the entire signup transaction aborts — surfacing to the client as a generic
"Database error".

Proof: the existing user (jeanguelb@gmail.com) has a profile row but NO wallet
row, confirming the wallet trigger failed during their signup (the profile
insert committed because it ran first in the chain, but the wallet insert did
not).

## Fix
Add `SET search_path = public` to all 6 SECURITY DEFINER trigger functions that
were missing it:
  - create_wallet_on_profile  (the signup killer)
  - award_reputation_on_community
  - award_reputation_on_post
  - award_reputation_on_reaction
  - enforce_single_equipped_frame
  - update_community_member_count

Also wrap the wallet insert in a BEGIN/EXCEPTION block so that even if the
wallet insert fails for any reason, it does not abort the signup — the profile
is the critical row; a missing wallet can be repaired later.

## Security
- SET search_path = public is the Supabase-recommended hardening for SECURITY
  DEFINER functions (prevents search_path hijacking).
- No data is lost; no tables or columns are dropped.
*/

-- 1. create_wallet_on_profile: add search_path + make non-fatal
CREATE OR REPLACE FUNCTION public.create_wallet_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Never let a wallet-creation failure abort the signup. The profile row is
    -- the critical record; a missing wallet can be repaired later.
    RAISE WARNING 'create_wallet_on_profile failed for user %: % %', NEW.id, SQLSTATE, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

-- 2. award_reputation_on_community
CREATE OR REPLACE FUNCTION public.award_reputation_on_community()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO reputation_log (user_id, action, points, reference_type, reference_id)
  VALUES (NEW.founder_id, 'create_community', 50, 'community', NEW.id);
  RETURN NEW;
END;
$function$;

-- 3. award_reputation_on_post
CREATE OR REPLACE FUNCTION public.award_reputation_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO reputation_log (user_id, action, points, reference_type, reference_id)
  VALUES (NEW.author_id, 'create_post', 5, 'post', NEW.id);
  RETURN NEW;
END;
$function$;

-- 4. award_reputation_on_reaction
CREATE OR REPLACE FUNCTION public.award_reputation_on_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.author_id IS NOT NULL THEN
    INSERT INTO reputation_log (user_id, action, points, reference_type, reference_id)
    VALUES (NEW.author_id, 'reaction_received', 2, 'reaction', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. enforce_single_equipped_frame
CREATE OR REPLACE FUNCTION public.enforce_single_equipped_frame()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_equipped THEN
    UPDATE public.user_frames SET is_equipped = false
    WHERE user_id = NEW.user_id AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 6. update_community_member_count
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.communities SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- Repair: create the missing wallet for the existing user who signed up before
-- the fix. Use ON CONFLICT in case it was already created.
INSERT INTO public.wallets (user_id, balance)
SELECT p.id, 0 FROM public.profiles p
LEFT JOIN public.wallets w ON w.user_id = p.id
WHERE w.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
