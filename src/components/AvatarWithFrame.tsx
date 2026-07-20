import { User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FRAME_RARITIES, type FrameRarity } from '../lib/types';

const RARITY_RING: Record<FrameRarity, string> = {
  common: 'ring-2 ring-ink-400',
  uncommon: 'ring-2 ring-emerald-500',
  rare: 'ring-2 ring-sky-500',
  epic: 'ring-2 ring-violet-500',
  legendary: 'ring-2 ring-amber-500',
  mythic: 'ring-2 ring-rose-500',
};

const RARITY_GLOW: Record<FrameRarity, string> = {
  common: '',
  uncommon: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  rare: 'shadow-[0_0_10px_rgba(14,165,233,0.4)]',
  epic: 'shadow-[0_0_12px_rgba(139,92,246,0.4)]',
  legendary: 'pulse-glow',
  mythic: 'pulse-glow-mythic',
};

const RARITY_ANIM: Record<FrameRarity, string> = {
  common: '',
  uncommon: '',
  rare: '',
  epic: '',
  legendary: 'crown-shine',
  mythic: 'crown-shine',
};

export function AvatarWithFrame({
  src,
  alt,
  size = 'md',
  to,
  frameRarity,
  frameIcon,
  showFrame = true,
}: {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  to?: string;
  frameRarity?: FrameRarity | null;
  frameIcon?: string | null;
  showFrame?: boolean;
}) {
  const dims = {
    xs: 'h-7 w-7',
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  }[size];

  const iconSize = {
    xs: 'text-[8px]',
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-base',
    xl: 'text-xl',
  }[size];

  const rarity = showFrame && frameRarity ? frameRarity : null;
  const ringCls = rarity ? RARITY_RING[rarity] : '';
  const glowCls = rarity ? RARITY_GLOW[rarity] : '';
  const animCls = rarity ? RARITY_ANIM[rarity] : '';
  const rarityMeta = rarity ? FRAME_RARITIES.find((r) => r.key === rarity) : null;

  const cls = `${dims} rounded-full overflow-hidden flex items-center justify-center bg-ink-200 dark:bg-ink-800 ${ringCls} ${glowCls} ${animCls} transition-all duration-300`;

  const inner = src ? (
    <img src={src} alt={alt} className="h-full w-full object-cover" />
  ) : (
    <User className="h-1/2 w-1/2 text-ink-400" />
  );

  const content = (
    <span className="group relative inline-block shrink-0">
      <span className={cls}>{inner}</span>
      {rarity && frameIcon && (
        <span
          className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-white dark:bg-ink-900 ${iconSize} ${rarityMeta?.color ?? ''} ring-1 ring-white dark:ring-ink-900 transition-transform group-hover:scale-110`}
          style={{ fontSize: 'inherit' }}
        >
          {frameIcon}
        </span>
      )}
    </span>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  return content;
}
