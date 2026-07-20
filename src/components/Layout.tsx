import { type ReactNode, useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AnnouncementBanner } from './AnnouncementBanner';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { useAuth } from '../lib/auth';
import { canBypassMaintenance } from '../lib/permissions';
import { supabase } from '../lib/supabase';
import type { AppConfig } from '../lib/types';

export function Layout({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();
  const { profile, loading } = useAuth();
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    supabase.from('app_config').select('*').eq('id', 1).maybeSingle().then(({ data, error }) => {
      if (error) console.error('[layout] app_config:', error.message);
      if (data) setConfig(data as AppConfig);
    });
  }, []);

  if (!loading && config?.maintenance_mode && !canBypassMaintenance(profile?.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 px-4">
        <div className="w-full max-w-lg text-center">
          <div className="mb-6 flex justify-center">
            <div className="inline-flex rounded-3xl bg-gold-500/15 p-6">
              <span className="text-5xl">🏰</span>
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-gold-400">El Reino está en mantenimiento</h1>
          <p className="mt-4 text-base text-ink-300">
            {config.maintenance_message || 'Estamos mejorando Imperio para ti. Volveremos pronto.'}
          </p>
          {config.maintenance_return_date && (
            <p className="mt-4 text-sm text-gold-300">
              Retorno estimado: {new Date(config.maintenance_return_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBanner />
      <Navbar />
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-rose-600 px-4 py-2 text-sm text-white animate-fade-in">
          <WifiOff className="h-4 w-4" />
          Sin conexión. Algunas funciones pueden no estar disponibles.
        </div>
      )}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
