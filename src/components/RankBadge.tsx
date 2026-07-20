import { MEDIEVAL_RANKS, type MedievalRank, type Profile } from '../lib/types';

const RANK_STYLES: Record<MedievalRank, string> = {
  campesino: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  escudero: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  caballero: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  caballero_real: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  baron: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  conde: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  duque: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  lord: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  rey: 'bg-gold-100 text-gold-700 dark:bg-gold-950 dark:text-gold-300',
  emperador: 'bg-gradient-to-r from-amber-400 to-rose-500 text-white',
};

const ROLE_STYLES: Record<string, { label: string; cls: string }> = {
  supreme_admin: { label: 'Supremo', cls: 'bg-gradient-to-r from-amber-500 to-rose-600 text-white' },
  admin: { label: 'Admin', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  moderator: { label: 'Moderador', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  user: { label: '', cls: '' },
};

export function RankBadge({
  rank,
  size = 'sm',
  showEmoji = true,
}: {
  rank: MedievalRank;
  size?: 'xs' | 'sm' | 'md';
  showEmoji?: boolean;
}) {
  const meta = MEDIEVAL_RANKS.find((r) => r.key === rank) ?? MEDIEVAL_RANKS[0];
  const cls = RANK_STYLES[rank] ?? RANK_STYLES.campesino;
  const sizeCls = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeCls} ${cls}`}>
      {showEmoji && <span className="text-[0.85em]">{meta.emoji}</span>}
      {meta.label}
    </span>
  );
}

export function RoleBadge({ role, size = 'sm' }: { role: Profile['role']; size?: 'xs' | 'sm' | 'md' }) {
  const meta = ROLE_STYLES[role];
  if (!meta.label) return null;
  const sizeCls = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeCls} ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export function RankProgress({ points, compact = false }: { points: number; compact?: boolean }) {
  const sorted = [...MEDIEVAL_RANKS].sort((a, b) => a.min_points - b.min_points);
  const current = [...sorted].reverse().find((r) => points >= r.min_points) ?? sorted[0];
  const next = sorted.find((r) => r.min_points > current.min_points);

  if (!next) {
    return (
      <div className={compact ? '' : 'card p-4'}>
        <div className="flex items-center justify-between">
          <RankBadge rank={current.key} size="md" />
          <span className="text-sm font-semibold text-gold-600 dark:text-gold-400">Rango máximo</span>
        </div>
      </div>
    );
  }

  const span = next.min_points - current.min_points;
  const done = points - current.min_points;
  const progress = Math.min(100, Math.round((done / span) * 100));
  const pointsToNext = next.min_points - points;

  return (
    <div className={compact ? '' : 'card p-4'}>
      <div className="flex items-center justify-between">
        <RankBadge rank={current.key} size="md" />
        <div className="text-right">
          <span className="text-xs text-ink-500 dark:text-ink-400">Siguiente: </span>
          <RankBadge rank={next.key} size="sm" />
        </div>
      </div>
      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
          <span>{points} pts</span>
          <span>{pointsToNext} pts para subir</span>
        </div>
      </div>
    </div>
  );
}
