import { Logo } from './Logo';

export function PageLoader({ full = false }: { full?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${full ? 'min-h-screen' : 'min-h-[60vh]'}`}>
      <Logo size="md" withText={false} />
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-300 border-t-gold-600" />
      <p className="text-sm text-ink-500 dark:text-ink-400">Cargando...</p>
    </div>
  );
}
