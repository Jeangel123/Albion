/*
# Phase 10.8.1 — Backfill chat rooms for existing communities

## Purpose
Fixes the bug where communities created before the fix had no associated
chat_room or chat_room_members, so their members could not send messages.

## Changes
1. Creates a chat_room for each community that lacks one (id = community.id)
2. Adds all existing community_members to chat_room_members for their community's room

## Notes
- Idempotent: uses ON CONFLICT DO NOTHING to skip communities/members that already exist.
- Does not modify existing chat_rooms or memberships.
*/

INSERT INTO chat_rooms (id, type, name, created_by, created_at)
SELECT c.id, 'community', c.name, c.owner_id, c.created_at
FROM communities c
WHERE NOT EXISTS (SELECT 1 FROM chat_rooms r WHERE r.id = c.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_room_members (room_id, user_id, joined_at)
SELECT cm.community_id, cm.user_id, cm.joined_at
FROM community_members cm
WHERE NOT EXISTS (
  SELECT 1 FROM chat_room_members m
  WHERE m.room_id = cm.community_id AND m.user_id = cm.user_id
)
ON CONFLICT DO NOTHING;
