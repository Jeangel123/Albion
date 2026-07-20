import { type ReactNode } from 'react';
import { WifiOff } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useOnlineStatus } from '../lib/useOnlineStatus';

export function Layout({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();

  return (
    <div className="flex min-h-screen flex-col">
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
