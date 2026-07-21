import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Avatar } from '../components/Avatar';
import { Spinner, EmptyState } from '../components/ui';
import type { Guild, Profile, Alliance } from '../lib/types';

type Tab = 'gremios' | 'jugadores' | 'alianzas';

export default function RankingsPage() {
  const [tab, setTab] = useState<Tab>('gremios');
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [alliances, setAlliances] = useState<(Alliance & { member_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (tab === 'gremios') {
        const { data } = await supabase.from('guilds').select('*').order('member_count', { ascending: false }).limit(50);
        setGuilds(data ?? []);
      } else if (tab === 'jugadores') {
        let follows: any = null;
        try { const r = await supabase.rpc('get_player_followers_ranking' as any); follows = r.data; } catch {}
        if (!follows) {
          const { data: prof } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
          setPlayers(prof ?? []);
        } else {
          setPlayers(follows as Profile[]);
        }
      } else {
        const { data: al } = await supabase.from('alliances').select('*').order('created_at', { ascending: false });
        const withCounts = await Promise.all((al ?? []).map(async (a) => {
          const { count } = await supabase.from('alliance_members').select('id', { count: 'exact', head: true }).eq('alliance_id', a.id);
          return { ...a, member_count: count ?? 0 };
        }));
        setAlliances(withCounts.sort((a, b) => b.member_count - a.member_count));
      }
      setLoading(false);
    })();
  }, [tab]);

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-gold-100 p-3 dark:bg-gold-950"><Trophy className="h-6 w-6 text-gold-600 dark:text-gold-400" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Rankings</h1>
          <p className="text-sm text-ink-500">Los mejores de la comunidad</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-ink-200 dark:border-ink-800">
        {([['gremios', 'Gremios', Users], ['jugadores', 'Jugadores', Trophy], ['alianzas', 'Alianzas', Shield]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition ${tab === key ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : tab === 'gremios' ? (
        guilds.length === 0 ? <EmptyState icon={Users} title="Sin gremios" /> : (
          <div className="card divide-y divide-ink-100 dark:divide-ink-800">
            {guilds.map((g, i) => <RankRow key={g.id} rank={i + 1} to={`/gremio/${g.slug}`} title={g.name} sub={`${g.member_count} miembros`} avatar={g.avatar_url} badge={i < 3} />)}
          </div>
        )
      ) : tab === 'jugadores' ? (
        players.length === 0 ? <EmptyState icon={Trophy} title="Sin jugadores" /> : (
          <div className="card divide-y divide-ink-100 dark:divide-ink-800">
            {players.map((p, i) => <RankRow key={p.id} rank={i + 1} to={`/perfil/${p.username}`} title={p.display_name || p.username} sub={`@${p.username}`} avatar={p.avatar_url} badge={i < 3} />)}
          </div>
        )
      ) : (
        alliances.length === 0 ? <EmptyState icon={Shield} title="Sin alianzas" /> : (
          <div className="card divide-y divide-ink-100 dark:divide-ink-800">
            {alliances.map((a, i) => <RankRow key={a.id} rank={i + 1} to={`/alianza/${a.slug}`} title={a.name} sub={`${a.member_count} gremios`} avatar={a.avatar_url} badge={i < 3} />)}
          </div>
        )
      )}
    </div>
  );
}

function RankRow({ rank, to, title, sub, avatar, badge }: { rank: number; to: string; title: string; sub: string; avatar: string | null; badge: boolean }) {
  const medal = rank === 1 ? 'text-gold-400' : rank === 2 ? 'text-ink-300' : rank === 3 ? 'text-amber-600' : '';
  return (
    <Link to={to} className="flex items-center gap-4 p-4 hover:bg-ink-50 dark:hover:bg-ink-800/50">
      <span className={`w-8 text-center font-display text-lg font-bold ${medal}`}>{rank}</span>
      <Avatar src={avatar} alt={title} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        <p className="text-xs text-ink-500">{sub}</p>
      </div>
      {badge && <Trophy className="h-5 w-5 text-gold-500" />}
    </Link>
  );
}
