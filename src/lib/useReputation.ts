import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { useRealtime, upsertById } from './useRealtime';
import type { ReputationLog } from './types';

export function useReputation() {
  const { profile } = useAuth();
  const [log, setLog] = useState<ReputationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reputation_log')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) console.error('[reputation] load:', error.message);
      if (!error && data) setLog(data as ReputationLog[]);
    } catch (err) {
      console.error('[reputation] fatal:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime<ReputationLog>({
    table: 'reputation_log',
    filter: `user_id=eq.${profile?.id ?? ''}`,
    onEvent: ({ eventType, new: row }) => {
      if (eventType === 'DELETE' || !row) return;
      setLog((prev) => upsertById(prev, row));
    },
  });

  return { log, loading, refresh: load };
}
