import { Crown, Star, BadgeCheck, Shield } from 'lucide-react';
import type { Profile, Guild } from '../lib/types';

type BadgeKey = 'verified' | 'featured' | 'founder' | 'guild_featured' | 'guild_verified';

type BadgeMeta = {
  key: BadgeKey;
  label: string;
  cls: string;
  icon: typeof Crown;
};

const BADGES: Record<BadgeKey, BadgeMeta> = {
  verified: {
    key: 'verified',
    label: 'Verificado',
    cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    icon: BadgeCheck,
  },
  featured: {
    key: 'featured',
    label: 'Destacado',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    icon: Star,
  },
  founder: {
    key: 'founder',
    label: 'Fundador',
    cls: 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)]',
    icon: Crown,
  },
  guild_featured: {
    key: 'guild_featured',
    label: 'Gremio destacado',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    icon: Shield,
  },
  guild_verified: {
    key: 'guild_verified',
    label: 'Verificado',
    cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    icon: BadgeCheck,
  },
};

function Badge({ meta, size = 'sm' }: { meta: BadgeMeta; size?: 'xs' | 'sm' | 'md' }) {
  const sizeCls = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1',
  }[size];
  const Icon = meta.icon;
  return (
    <span
      title={meta.label}
      className={`inline-flex items-center rounded-full font-semibold transition-transform hover:scale-105 ${sizeCls} ${meta.cls}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export function UserBadges({
  profile,
  size = 'sm',
  className = '',
}: {
  profile: Pick<Profile, 'is_verified' | 'role'> & { is_featured?: boolean };
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const badges: BadgeMeta[] = [];
  if (profile.role === 'founder') badges.push(BADGES.founder);
  if (profile.is_verified) badges.push(BADGES.verified);
  if (profile.is_featured) badges.push(BADGES.featured);
  if (badges.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((b) => (
        <Badge key={b.key} meta={b} size={size} />
      ))}
    </div>
  );
}

export function GuildBadges({
  guild,
  size = 'sm',
  className = '',
}: {
  guild: Pick<Guild, 'is_verified' | 'is_featured'>;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const badges: BadgeMeta[] = [];
  if (guild.is_featured) badges.push(BADGES.guild_featured);
  if (guild.is_verified) badges.push(BADGES.guild_verified);
  if (badges.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((b) => (
        <Badge key={b.key} meta={b} size={size} />
      ))}
    </div>
  );
}
