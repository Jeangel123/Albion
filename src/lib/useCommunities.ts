import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { useRealtime, upsertById, removeById } from './useRealtime';
import type { Community, CommunityMember } from './types';

export function useCommunities() {
  const { profile } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [memberships, setMemberships] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, mRes] = await Promise.all([
      supabase.from('communities').select('*').order('member_count', { ascending: false }),
      profile?.id
        ? supabase.from('community_members').select('*').eq('user_id', profile.id)
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (!cRes.error && cRes.data) setCommunities(cRes.data as Community[]);
    if (!mRes.error && mRes.data) setMemberships(mRes.data as CommunityMember[]);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime<Community>({
    table: 'communities',
    onEvent: ({ eventType, new: row, old: oldRow }) => {
      if (eventType === 'DELETE' || !row) {
        if (oldRow) setCommunities((prev) => removeById(prev, oldRow.id));
        return;
      }
      setCommunities((prev) => upsertById(prev, row));
    },
  });

  useRealtime<CommunityMember>({
    table: 'community_members',
    filter: `user_id=eq.${profile?.id ?? ''}`,
    onEvent: ({ eventType, new: row, old: oldRow }) => {
      if (eventType === 'DELETE' || !row) {
        if (oldRow) setMemberships((prev) => removeById(prev, oldRow.id));
        return;
      }
      setMemberships((prev) => upsertById(prev, row));
    },
  });

  const joinedCommunityIds = new Set(memberships.map((m) => m.community_id));

  const isMember = useCallback(
    (communityId: string) => joinedCommunityIds.has(communityId),
    [joinedCommunityIds],
  );

  const membership = useCallback(
    (communityId: string) => memberships.find((m) => m.community_id === communityId) ?? null,
    [memberships],
  );

  const join = useCallback(
    async (communityId: string) => {
      if (!profile?.id) return { error: 'No autenticado' };
      const { error } = await supabase
        .from('community_members')
        .insert({ community_id: communityId, user_id: profile.id, role: 'member' });
      if (!error) {
        await supabase.from('chat_room_members').insert({ room_id: communityId, user_id: profile.id });
      }
      return { error: error?.message ?? null };
    },
    [profile?.id],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const { error } = await supabase.from('messages').delete().eq('id', messageId);
      return { error: error?.message ?? null };
    },
    [],
  );

  const leave = useCallback(
    async (communityId: string) => {
      if (!profile?.id) return { error: 'No autenticado' };
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', profile.id);
      if (!error) {
        await supabase.from('chat_room_members').delete().eq('room_id', communityId).eq('user_id', profile.id);
      }
      return { error: error?.message ?? null };
    },
    [profile?.id],
  );

  const create = useCallback(
    async (input: { name: string; slug: string; description?: string; category?: string; avatar_url?: string; banner_url?: string }) => {
      if (!profile?.id) return { error: 'No autenticado', data: null as Community | null };
      const { data, error } = await supabase
        .from('communities')
        .insert({ ...input, owner_id: profile.id })
        .select('*')
        .maybeSingle();
      if (error) return { error: error.message, data: null };
      return { error: null, data: data as Community };
    },
    [profile?.id],
  );

  return {
    communities,
    memberships,
    joinedCommunityIds,
    isMember,
    membership,
    join,
    leave,
    create,
    deleteMessage,
    loading,
    refresh: load,
  };
}
