import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Search, Castle, Shield, Crown, Globe } from 'lucide-react';
import { useCommunities } from '../lib/useCommunities';
import { useAuth } from '../lib/auth';
import { Spinner, EmptyState } from '../components/ui';
import { COMMUNITY_CATEGORIES, type Community } from '../lib/types';

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Castle }> = {
  general: { label: 'General', icon: Castle },
  pvp: { label: 'PvP', icon: Shield },
  pve: { label: 'PvE', icon: Users },
  avalon: { label: 'Avalon', icon: Crown },
  faccion: { label: 'Facción', icon: Shield },
  recoleccion: { label: 'Recolección', icon: Users },
  economia: { label: 'Economía', icon: Globe },
  zvz: { label: 'ZvZ', icon: Shield },
  hce: { label: 'HCE', icon: Castle },
  crafting: { label: 'Crafting', icon: Users },
  español: { label: 'Español', icon: Globe },
  ingles: { label: 'Inglés', icon: Globe },
};

export default function CommunitiesPage() {
  const { profile } = useAuth();
  const { communities, loading, isMember, join, leave } = useCommunities();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  const filtered = communities.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !c.description?.toLowerCase().includes(q.toLowerCase())) return false;
    if (category && c.category !== category) return false;
    return true;
  });

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Comunidades</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Únete a comunidades por interés</p>
        </div>
        {profile && (
          <Link to="/comunidad/crear" className="btn-primary">
            <Plus className="h-4 w-4" /> Crear comunidad
          </Link>
        )}
      </div>

      <div className="card mb-6 space-y-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar comunidades..."
            className="input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory('')}
            className={`chip transition ${category === '' ? 'bg-blue-500 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
          >
            Todas
          </button>
          {COMMUNITY_CATEGORIES.map((cat) => {
            const meta = CATEGORY_LABELS[cat];
            return (
              <button
                key={cat}
                onClick={() => setCategory(category === cat ? '' : cat)}
                className={`chip transition ${category === cat ? 'bg-blue-500 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
              >
                {meta && <meta.icon className="mr-1 inline h-3 w-3" />}
                {meta?.label ?? cat}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay comunidades"
          hint="Prueba con otros filtros o crea la primera."
          action={profile ? { to: '/comunidad/crear', label: 'Crear comunidad' } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CommunityCard
              key={c.id}
              community={c}
              joined={isMember(c.id)}
              onJoin={async () => {
                if (!profile) return;
                const { error } = await join(c.id);
                if (error) console.error(error);
              }}
              onLeave={async () => {
                if (!profile) return;
                const { error } = await leave(c.id);
                if (error) console.error(error);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommunityCard({
  community,
  joined,
  onJoin,
  onLeave,
}: {
  community: Community;
  joined: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const meta = CATEGORY_LABELS[community.category];
  return (
    <div className="card overflow-hidden p-0 card-hover">
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-ink-700 via-ink-800 to-ink-950">
        {community.banner_url ? (
          <img src={community.banner_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 40%, rgba(196,144,42,0.4), transparent 45%), radial-gradient(circle at 70% 60%, rgba(196,144,42,0.2), transparent 50%)',
            }}
          />
        )}
        <div className="absolute -bottom-6 left-4 h-14 w-14 overflow-hidden rounded-xl border-4 border-white bg-ink-200 shadow-lg dark:border-ink-900 dark:bg-ink-800">
          {community.avatar_url ? (
            <img src={community.avatar_url} alt={community.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-xl font-bold text-gold-500">
              {community.name[0]?.toUpperCase()}
            </div>
          )}
        </div>
        {community.is_verified && (
          <span className="absolute right-2 top-2 rounded-full bg-gold-500 px-2 py-0.5 text-xs font-semibold text-ink-950">
            Verificada
          </span>
        )}
      </div>
      <div className="p-4 pt-8">
        <Link to={`/comunidad/${community.slug}`}>
          <h3 className="font-display text-lg font-semibold text-ink-900 hover:text-gold-600 dark:text-white">
            {community.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-center gap-3 text-xs text-ink-500 dark:text-ink-400">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {community.member_count}
          </span>
          {meta && (
            <span className="inline-flex items-center gap-1">
              <meta.icon className="h-3.5 w-3.5" /> {meta.label}
            </span>
          )}
        </div>
        {community.description && (
          <p className="mt-2 line-clamp-2 text-sm text-ink-600 dark:text-ink-300">
            {community.description}
          </p>
        )}
        <div className="mt-3">
          {joined ? (
            <button onClick={onLeave} className="btn-outline w-full text-sm">
              Salir
            </button>
          ) : (
            <button onClick={onJoin} className="btn-primary w-full text-sm">
              Unirse
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
