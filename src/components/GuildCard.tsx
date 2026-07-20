import { Link } from 'react-router-dom';
import { Users, MapPin, Globe, BadgeCheck, Crown, Rocket } from 'lucide-react';
import type { Guild } from '../lib/types';
import { ACTIVITIES } from '../lib/types';

export function GuildCard({ guild }: { guild: Guild }) {
  const isBoosted = guild.is_boosted && guild.boosted_until && new Date(guild.boosted_until) > new Date();
  return (
    <Link to={`/gremio/${guild.slug}`} className="card card-hover group block overflow-hidden">
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950">
        {guild.banner_url ? (
          <img src={guild.banner_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(196,144,42,0.4), transparent 50%), radial-gradient(circle at 70% 50%, rgba(133,87,31,0.3), transparent 50%)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
        {guild.is_featured && (
          <span className="absolute right-3 top-3 chip bg-gold-500/90 text-ink-950 text-[10px] font-bold backdrop-blur">
            <Crown className="h-3 w-3" /> Destacado
          </span>
        )}
        {isBoosted && (
          <span className="absolute left-3 top-3 chip bg-amber-500/90 text-ink-950 text-[10px] font-bold backdrop-blur">
            <Rocket className="h-3 w-3" /> Promocionado
          </span>
        )}
        <div className="absolute -bottom-8 left-4">
          <div className="h-16 w-16 overflow-hidden rounded-xl border-4 border-white bg-ink-200 shadow-lg transition-transform duration-300 group-hover:scale-105 dark:border-ink-900 dark:bg-ink-800">
            {guild.avatar_url ? (
              <img src={guild.avatar_url} alt={guild.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl font-display font-bold text-gold-500">{guild.name[0]}</div>
            )}
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 pt-10">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-display font-semibold text-ink-900 dark:text-white">{guild.name}</h3>
          {guild.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-gold-500" />}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500 dark:text-ink-400">
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {guild.member_count}</span>
          {guild.home_city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {guild.home_city}</span>}
          {guild.language && <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {guild.language}</span>}
        </div>
        {guild.activities?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {guild.activities.slice(0, 3).map((a) => (
              <span key={a} className="chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">{a}</span>
            ))}
            {guild.activities.length > 3 && <span className="chip bg-ink-100 text-ink-500 dark:bg-ink-800">+{guild.activities.length - 3}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

export function ActivityFilter({ selected, onChange }: { selected: string[]; onChange: (a: string[]) => void }) {
  function toggle(a: string) {
    onChange(selected.includes(a) ? selected.filter((x) => x !== a) : [...selected, a]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {ACTIVITIES.map((a) => (
        <button
          key={a}
          onClick={() => toggle(a)}
          className={`chip transition ${selected.includes(a) ? 'bg-gold-500 text-ink-950 shadow-sm' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'}`}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
