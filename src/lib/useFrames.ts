import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { useRealtime, upsertById } from './useRealtime';
import type { AvatarFrame, UserFrame } from './types';

export function useFrames() {
  const { profile } = useAuth();
  const [catalog, setCatalog] = useState<AvatarFrame[]>([]);
  const [owned, setOwned] = useState<UserFrame[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, ownRes] = await Promise.all([
        supabase.from('avatar_frames').select('*').order('price', { ascending: true }),
        profile?.id
          ? supabase.from('user_frames').select('*').eq('user_id', profile.id)
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (catRes.error) console.error('[frames] catalog:', catRes.error.message);
      if (ownRes.error) console.error('[frames] owned:', ownRes.error.message);
      if (!catRes.error && catRes.data) setCatalog(catRes.data as AvatarFrame[]);
      if (!ownRes.error && ownRes.data) setOwned(ownRes.data as UserFrame[]);
    } catch (err) {
      console.error('[frames] fatal:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime<UserFrame>({
    table: 'user_frames',
    filter: `user_id=eq.${profile?.id ?? ''}`,
    onEvent: ({ eventType, new: row, old: oldRow }) => {
      if (eventType === 'DELETE' || !row) {
        if (oldRow) setOwned((prev) => prev.filter((f) => f.id !== oldRow.id));
        return;
      }
      setOwned((prev) => upsertById(prev, row));
    },
  });

  const equippedFrame = owned.find((f) => f.is_equipped) ?? null;
  const ownedFrameIds = new Set(owned.map((f) => f.frame_id));

  const isOwned = useCallback(
    (frameId: string) => ownedFrameIds.has(frameId),
    [ownedFrameIds],
  );

  const equip = useCallback(
    async (userFrameId: string) => {
      if (!profile?.id) return { error: 'No autenticado' };
      const { error } = await supabase
        .from('user_frames')
        .update({ is_equipped: true })
        .eq('id', userFrameId)
        .eq('user_id', profile.id);
      return { error: error?.message ?? null };
    },
    [profile?.id],
  );

  const unequip = useCallback(async () => {
    if (!profile?.id) return { error: 'No autenticado' };
    const { error } = await supabase
      .from('user_frames')
      .update({ is_equipped: false })
      .eq('user_id', profile.id)
      .eq('is_equipped', true);
    return { error: error?.message ?? null };
  }, [profile?.id]);

  return {
    catalog,
    owned,
    equippedFrame,
    isOwned,
    equip,
    unequip,
    loading,
    refresh: load,
  };
}
