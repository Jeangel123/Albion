import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Season, SeasonRanking } from './types';

export function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('seasons').select('*').order('number', { ascending: false });
    const list = (data ?? []) as Season[];
    setSeasons(list);
    setActiveSeason(list.find((s) => s.status === 'active') ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { seasons, activeSeason, loading, reload: load };
}

export function useSeasonRankings(seasonId: string | null) {
  const [rankings, setRankings] = useState<SeasonRanking[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!seasonId) { setRankings([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('season_rankings')
      .select('*, user:profiles(username, display_name, avatar_url, medieval_rank, role)')
      .eq('season_id', seasonId)
      .order('position', { ascending: true });
    setRankings((data ?? []) as SeasonRanking[]);
    setLoading(false);
  }, [seasonId]);

  useEffect(() => { load(); }, [load]);

  return { rankings, loading, reload: load };
}
