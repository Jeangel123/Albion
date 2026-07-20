import { Crown } from 'lucide-react';

type Props = {
  name: string;
  className?: string;
};

export function FounderName({ name, className = '' }: Props) {
  return (
    <span className={`founder-name inline-flex items-center gap-1 ${className}`}>
      <Crown className="h-3.5 w-3.5 text-sky-400 drop-shadow-[0_0_4px_rgba(0,200,255,0.8)]" />
      {name}
    </span>
  );
}

export function isFounderRole(role?: string | null): boolean {
  return role === 'founder';
}
