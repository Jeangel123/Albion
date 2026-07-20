import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GuildCard, ActivityFilter } from '../components/GuildCard';
import { Spinner, EmptyState } from '../components/ui';
import { useAuth } from '../lib/auth';
import type { Guild } from '../lib/types';

export default function GuildsPage() {
  const { profile } = useAuth();
  const [guilds, setGuilds] = useState<Guild[] | null>(null);
  const [q, setQ] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('');

  useEffect(() => {
    (async () => {
      let query = supabase.from('guilds').select('*').order('created_at', { ascending: false });
      if (q) query = query.ilike('name', `%${q}%`);
      if (city) query = query.ilike('home_city', `%${city}%`);
      if (language) query = query.ilike('language', `%${language}%`);
      const { data } = await query;
      let list = data ?? [];
      if (activities.length > 0) {
        list = list.filter((g) => activities.every((a) => g.activities?.includes(a)));
      }
      setGuilds(list);
    })();
  }, [q, activities, city, language]);

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Gremios</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Encuentra el gremio perfecto para tu estilo de juego</p>
        </div>
        {profile && (
          <Link to="/gremio/crear" className="btn-primary"><Plus className="h-4 w-4" /> Crear gremio</Link>
        )}
      </div>

      <div className="card mb-6 space-y-4 p-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre..." className="input" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad" className="input" />
          <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Idioma" className="input" />
        </div>
        <div>
          <p className="label">Actividades</p>
          <ActivityFilter selected={activities} onChange={setActivities} />
        </div>
      </div>

      {!guilds ? <Spinner /> : guilds.length === 0 ? (
        <EmptyState icon={Users} title="No hay gremios" hint="Prueba con otros filtros o crea el primero." action={profile ? { to: '/gremio/crear', label: 'Crear gremio' } : undefined} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guilds.map((g) => <GuildCard key={g.id} guild={g} />)}
        </div>
      )}
    </div>
  );
}
