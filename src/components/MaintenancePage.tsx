import { useEffect, useState } from 'react';
import { Castle, Hammer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';
import type { AppConfig } from '../lib/types';

export function MaintenancePage() {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    supabase.from('app_config').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setConfig(data as AppConfig);
    });
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 px-4">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(218,165,32,0.3) 0%, transparent 50%)' }} />
      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="mb-6 inline-flex rounded-3xl bg-gold-500/15 p-6 animate-pulse-slow">
          <Hammer className="h-12 w-12 text-gold-400" />
        </div>
        <h1 className="font-display text-3xl font-bold text-gold-400 sm:text-4xl">
          El Reino está en mantenimiento
        </h1>
        <p className="mt-4 text-base text-ink-300 sm:text-lg">
          {config?.maintenance_message || 'Estamos mejorando Imperio para ti. Volveremos pronto.'}
        </p>
        {config?.maintenance_return_date && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink-800/50 px-4 py-2.5 text-sm text-gold-300">
            <Castle className="h-4 w-4" />
            Retorno estimado: {new Date(config.maintenance_return_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
        <p className="mt-8 text-xs text-ink-500">
          Gracias por tu paciencia, noble habitante del Imperio.
        </p>
      </div>
    </div>
  );
}
