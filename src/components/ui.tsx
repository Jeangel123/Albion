import { Link } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: { to: string; label: string } }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center animate-fade-in">
      <div className="rounded-2xl bg-gradient-to-br from-gold-100 to-gold-50 p-4 dark:from-gold-950/50 dark:to-ink-900">
        <Icon className="h-8 w-8 text-gold-500" />
      </div>
      <h3 className="text-base font-semibold text-ink-800 dark:text-ink-100">{title}</h3>
      {hint && <p className="max-w-sm text-sm text-ink-500 dark:text-ink-400">{hint}</p>}
      {action && <Link to={action.to} className="btn-primary mt-2">{action.label}</Link>}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-300 border-t-gold-600" />
    </div>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: { to: string; label: string } }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-white">{title}</h2>
      {action && (
        <Link to={action.to} className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
          {action.label} →
        </Link>
      )}
    </div>
  );
}
