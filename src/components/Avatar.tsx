import { User } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Avatar({
  src,
  alt,
  size = 'md',
  to,
  ring = false,
}: {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  to?: string;
  ring?: boolean;
}) {
  const dims = {
    xs: 'h-7 w-7',
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  }[size];
  const cls = `${dims} rounded-full overflow-hidden flex items-center justify-center bg-ink-200 dark:bg-ink-800 ${
    ring ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-white dark:ring-offset-ink-950' : ''
  }`;
  const inner = src ? (
    <img src={src} alt={alt} className="h-full w-full object-cover" />
  ) : (
    <User className="h-1/2 w-1/2 text-ink-400" />
  );
  if (to) {
    return (
      <Link to={to} className={cls + ' shrink-0'}>
        {inner}
      </Link>
    );
  }
  return <span className={cls + ' shrink-0'}>{inner}</span>;
}
