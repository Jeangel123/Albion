/*
# Fix broken trigger functions referencing non-existent columns

## Root Cause
Two trigger functions reference column names that don't exist on their tables,
causing every INSERT to fail with: ERROR: record "new" has no field "..."

1. award_reputation_on_community() uses NEW.founder_id
   but communities table has owner_id (not founder_id)
   → Creating a community FAILS

2. award_reputation_on_reaction() uses NEW.author_id
   but reactions table has user_id (not author_id)
   → Liking a post FAILS

## Fix
Update both trigger functions to use the correct column names.

## Security
No security impact — these are reputation-awarding triggers that were broken.
*/

-- 1. Fix community trigger: founder_id → owner_id
CREATE OR REPLACE FUNCTION award_reputation_on_community()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO reputation_log (user_id, action, points, reference_type, reference_id)
  VALUES (NEW.owner_id, 'create_community', 50, 'community', NEW.id);
  RETURN NEW;
END;
$$;

-- 2. Fix reaction trigger: author_id → user_id
-- The reactions table has user_id (the person who reacted), not author_id.
-- The reputation should go to the POST author, not the reactor.
-- But since we don't have the post author's id in the reactions table directly,
-- we need to join to posts to get the author_id.
CREATE OR REPLACE FUNCTION award_reputation_on_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id uuid;
BEGIN
  -- Get the post author's id to award reputation to
  SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
  IF post_author_id IS NOT NULL THEN
    INSERT INTO reputation_log (user_id, action, points, reference_type, reference_id)
    VALUES (post_author_id, 'reaction_received', 2, 'reaction', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;