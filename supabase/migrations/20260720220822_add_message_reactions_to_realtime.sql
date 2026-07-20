/*
# Add message_reactions to realtime publication

## Problem
`message_reactions` was not in the `supabase_realtime` publication, so the ChatPanel's
realtime subscription for reactions (`useRealtime({ table: 'message_reactions', ... })`)
never received events. Reactions only appeared after a manual refresh.

## Change
Add `message_reactions` to the `supabase_realtime` publication so INSERT/UPDATE/DELETE
events are broadcast to subscribed clients.

## Security
No security impact — realtime publication only controls which tables broadcast changes;
RLS still governs which rows each client can read/subscribe to.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;