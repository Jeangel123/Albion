-- Fix search_path on SECURITY DEFINER functions used by the messages trigger.
-- Without an explicit search_path, Supabase may reject or fail these calls at runtime,
-- which causes the INSERT on messages to fail (the trigger runs AFTER INSERT).

ALTER FUNCTION award_reputation(uuid, text, integer, text, uuid) SET search_path = public;
ALTER FUNCTION award_reputation_on_message() SET search_path = public;
ALTER FUNCTION compute_rank(integer) SET search_path = public;