import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Users, Shield, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GuildCard, ActivityFilter } from '../components/GuildCard';
import { Avatar } from '../components/Avatar';
import { Spinner, EmptyState } from '../components/ui';
import type { Guild, Profile, Alliance } from '../lib/types';

type Tab = 'gremios' | 'jugadores' | 'alianzas';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [tab, setTab] = useState<Tab>('gremios');
  const [query, setQuery] = useState(q);
  const [activities, setActivities] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [results, setResults] = useState<{ guilds: Guild[]; players: Profile[]; alliances: Alliance[] } | null>(null);

  useEffect(() => { setQuery(q); }, [q]);

  useEffect(() => {
    (async () => {
      if (tab === 'gremios') {
        let r = supabase.from('guilds').select('*').order('created_at', { ascending: false });
        if (query) r = r.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
        if (city) r = r.ilike('home_city', `%${city}%`);
        const { data } = await r;
        let list = data ?? [];
        if (activities.length) list = list.filter((g) => activities.every((a) => g.activities?.includes(a)));
        setResults((p) => ({ guilds: list, players: p?.players ?? [], alliances: p?.alliances ?? [] }));
      } else if (tab === 'jugadores') {
        let r = supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (query) r = r.or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);
        const { data } = await r;
        setResults((p) => ({ guilds: p?.guilds ?? [], players: data ?? [], alliances: p?.alliances ?? [] }));
      } else {
        let r = supabase.from('alliances').select('*').order('created_at', { ascending: false });
        if (query) r = r.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
        const { data } = await r;
        setResults((p) => ({ guilds: p?.guilds ?? [], players: p?.players ?? [], alliances: data ?? [] }));
      }
    })();
  }, [tab, query, activities, city]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setParams(query ? { q: query } : {});
  }

  return (
    <div className="container-app py-6">
      <h1 className="mb-4 font-display text-2xl font-bold text-ink-900 dark:text-white">Buscar</h1>
      <form onSubmit={submit} className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar gremios, jugadores, alianzas..." className="input py-3 pl-11" />
      </form>

      <div className="mb-6 flex gap-1 border-b border-ink-200 dark:border-ink-800">
        {([['gremios', 'Gremios', Users], ['jugadores', 'Jugadores', User], ['alianzas', 'Alianzas', Shield]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition ${tab === key ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'gremios' && (
        <div className="card mb-4 space-y-4 p-4">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad" className="input" />
          <div><p className="label">Actividades</p><ActivityFilter selected={activities} onChange={setActivities} /></div>
        </div>
      )}

      {!results ? <Spinner /> : tab === 'gremios' ? (
        results.guilds.length === 0 ? <EmptyState icon={Users} title="Sin resultados" /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{results.guilds.map((g) => <GuildCard key={g.id} guild={g} />)}</div>
        )
      ) : tab === 'jugadores' ? (
        results.players.length === 0 ? <EmptyState icon={User} title="Sin resultados" /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.players.map((p) => (
              <Link key={p.id} to={`/perfil/${p.username}`} className="card flex items-center gap-3 p-3 card-hover">
                <Avatar src={p.avatar_url} alt={p.username} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.display_name || p.username}</p>
                  <p className="text-xs text-ink-500">@{p.username}</p>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        results.alliances.length === 0 ? <EmptyState icon={Shield} title="Sin resultados" /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.alliances.map((a) => (
              <Link key={a.id} to={`/alianza/${a.slug}`} className="card card-hover p-4">
                <h3 className="font-display font-semibold">{a.name}</h3>
                {a.description && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{a.description}</p>}
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
