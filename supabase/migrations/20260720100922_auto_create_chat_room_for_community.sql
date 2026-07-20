-- Auto-create a chat_room when a community is created, using the same ID.
-- This ensures chat_room_members can reference a valid room_id (= community.id)
-- and the messages RLS policy (which checks chat_room_members) works.

CREATE OR REPLACE FUNCTION create_chat_room_for_community()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO chat_rooms (id, type, name, created_by)
  VALUES (NEW.id, 'community', NEW.name, NEW.owner_id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_chat_room ON communities;
CREATE TRIGGER trg_create_chat_room
  AFTER INSERT ON communities
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_room_for_community();