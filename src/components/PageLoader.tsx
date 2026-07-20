import { Logo } from './Logo';

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Logo size="md" withText={false} />
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-300 border-t-gold-600" />
      <p className="text-sm text-ink-500 dark:text-ink-400">Cargando...</p>
    </div>
  );
}
