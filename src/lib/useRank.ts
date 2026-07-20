import { useMemo } from 'react';
import { useAuth } from './auth';
import { MEDIEVAL_RANKS, type MedievalRank } from './types';

export function useRank() {
  const { profile } = useAuth();
  const points = profile?.reputation_points ?? 0;
  const currentRank = (profile?.medieval_rank as MedievalRank | undefined) ?? 'campesino';

  const { rank, nextRank, progress, pointsToNext } = useMemo(() => {
    const sorted = [...MEDIEVAL_RANKS].sort((a, b) => b.min_points - a.min_points);
    const current = sorted.find((r) => points >= r.min_points) ?? MEDIEVAL_RANKS[0];
    const next = MEDIEVAL_RANKS.find((r) => r.min_points > current.min_points);
    if (!next) {
      return { rank: current, nextRank: null, progress: 100, pointsToNext: 0 };
    }
    const span = next.min_points - current.min_points;
    const done = points - current.min_points;
    return {
      rank: current,
      nextRank: next,
      progress: Math.min(100, Math.round((done / span) * 100)),
      pointsToNext: next.min_points - points,
    };
  }, [points]);

  return {
    points,
    currentRank,
    rank,
    nextRank,
    progress,
    pointsToNext,
    isMax: nextRank === null,
  };
}
