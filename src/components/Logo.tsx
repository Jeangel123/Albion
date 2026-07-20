import { Link } from 'react-router-dom';
import { Sun } from 'lucide-react';

export function Logo({ size = 'md', withText = true }: { size?: 'sm' | 'md' | 'lg'; withText?: boolean }) {
  const dims = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-14 w-14' }[size];
  const text = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' }[size];
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5">
      <span className={`${dims} relative inline-flex items-center justify-center`}>
        <Sun className={`${dims} text-gold-500 transition-transform duration-700 group-hover:rotate-90`} strokeWidth={2.2} />
        <span className="absolute inset-0 rounded-full bg-gold-400/20 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      {withText && (
        <span className={`font-display font-semibold tracking-wide ${text} text-ink-900 dark:text-white`}>
          Imperio
        </span>
      )}
    </Link>
  );
}
