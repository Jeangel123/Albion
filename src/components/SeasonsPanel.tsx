import { useState } from 'react';
import { Trophy, Plus, Check, X, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { RankBadge } from './RankBadge';
import { useSeasons, useSeasonRankings } from '../lib/useSeasons';
import { MEDIEVAL_RANKS, type Season } from '../lib/types';

export function SeasonsPanel({ adminId }: { adminId: string }) {
  const { seasons, activeSeason, reload } = useSeasons();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [ending, setEnding] = useState<string | null>(null);
  const { push } = useToast();

  async function createSeason() {
    const nextNumber = (seasons[0]?.number ?? 0) + 1;
    const { error } = await supabase.from('seasons').insert({
      number: nextNumber,
      name: name.trim() || `Temporada ${nextNumber}`,
      status: 'active',
      created_by: adminId,
    });
    if (error) return push({ type: 'error', message: error.message });
    push({ type: 'success', message: `Temporada ${nextNumber} creada` });
    setName('');
    setCreating(false);
    reload();
  }

  async function endSeason(season: Season) {
    setEnding(season.id);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, season_points, medieval_rank, role')
        .order('season_points', { ascending: false });

      const ranked = (profiles ?? []).filter((p: any) => p.season_points > 0 && p.role !== 'founder');
      const rows = ranked.map((p: any, i: number) => ({
        season_id: season.id,
        user_id: p.id,
        season_points: p.season_points,
        final_rank: p.medieval_rank,
        position: i + 1,
      }));

      if (rows.length > 0) {
        const { error: rankErr } = await supabase.from('season_rankings').upsert(rows, { onConflict: 'season_id,user_id' });
        if (rankErr) push({ type: 'error', message: `Ranking: ${rankErr.message}` });
      }

      const { error: endErr } = await supabase.from('seasons').update({
        status: 'ended',
        ends_at: new Date().toISOString(),
      }).eq('id', season.id);
      if (endErr) return push({ type: 'error', message: endErr.message });

      const { error: resetErr } = await supabase.from('profiles')
        .update({ season_points: 0 })
        .neq('role', 'founder');
      if (resetErr) push({ type: 'error', message: `Reset: ${resetErr.message}` });

      push({ type: 'success', message: `Temporada ${season.number} finalizada. ${rows.length} usuarios en el ranking.` });
      reload();
    } finally {
      setEnding(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-gold-500" />
          <div>
            <p className="font-medium">Temporadas</p>
            <p className="text-xs text-ink-500">Reinicia la clasificación competitiva sin afectar rangos permanentes ni staff.</p>
          </div>
        </div>
        <button onClick={() => setCreating((p) => !p)} className="btn-primary text-xs">
          <Plus className="h-3.5 w-3.5" /> Nueva temporada
        </button>
      </div>

      {creating && (
        <div className="card space-y-3 p-5">
          <label className="label">Nombre de la temporada</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Temporada ${(seasons[0]?.number ?? 0) + 1}`} />
          <div className="flex gap-2">
            <button onClick={createSeason} className="btn-primary"><Check className="h-4 w-4" /> Crear</button>
            <button onClick={() => setCreating(false)} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      {activeSeason && (
        <div className="card flex items-center justify-between p-5">
          <div>
            <p className="font-medium">{activeSeason.name} <span className="chip ml-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">Activa</span></p>
            <p className="text-xs text-ink-500">Inició {new Date(activeSeason.starts_at).toLocaleDateString('es-ES')}</p>
          </div>
          <button
            onClick={() => endSeason(activeSeason)}
            disabled={ending === activeSeason.id}
            className="btn-outline text-amber-600"
          >
            <RotateCcw className="h-4 w-4" /> {ending === activeSeason.id ? 'Finalizando...' : 'Finalizar temporada'}
          </button>
        </div>
      )}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {seasons.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">Sin temporadas todavía.</p>
        ) : seasons.map((s) => (
          <SeasonRow key={s.id} season={s} />
        ))}
      </div>
    </div>
  );
}

function SeasonRow({ season }: { season: Season }) {
  const [open, setOpen] = useState(false);
  const { rankings, loading } = useSeasonRankings(open ? season.id : null);

  return (
    <div className="p-4">
      <button onClick={() => setOpen((p) => !p)} className="flex w-full items-center justify-between text-left">
        <div>
          <p className="font-medium">
            #{season.number} · {season.name}
            <span className={`chip ml-2 text-[10px] ${season.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>
              {season.status === 'active' ? 'Activa' : 'Finalizada'}
            </span>
          </p>
          <p className="text-xs text-ink-500">
            {new Date(season.starts_at).toLocaleDateString('es-ES')}
            {season.ends_at && ` → ${new Date(season.ends_at).toLocaleDateString('es-ES')}`}
          </p>
        </div>
        {season.status === 'ended' && (
          <span className="text-xs text-gold-600">{open ? 'Ocultar' : 'Ver ranking'}</span>
        )}
      </button>
      {open && (
        <div className="mt-3 space-y-1.5">
          {loading ? (
            <p className="text-xs text-ink-400">Cargando ranking...</p>
          ) : rankings.length === 0 ? (
            <p className="text-xs text-ink-400">Sin datos de ranking para esta temporada.</p>
          ) : rankings.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-900">
              <span className="w-6 text-sm font-bold text-gold-600">#{r.position}</span>
              <span className="flex-1 truncate text-sm">{r.user?.display_name || r.user?.username || 'Usuario'}</span>
              <span className="text-xs text-ink-500">{r.season_points} pts</span>
              {r.final_rank && <RankBadge rank={r.final_rank} size="xs" showEmoji={false} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
