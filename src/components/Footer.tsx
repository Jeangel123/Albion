import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-200/70 bg-white dark:border-ink-800 dark:bg-ink-950">
      <div className="container-app py-10">
        <div className="flex flex-col items-center gap-6 text-center">
          <Logo size="lg" />
          <p className="max-w-md text-sm text-ink-500 dark:text-ink-400">
            La red social para gremios de Albion Online. Conecta, recluta, organiza eventos y domina Albion junto a la comunidad hispanohablante.
          </p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-600 dark:text-ink-300">
            <Link to="/gremios" className="hover:text-gold-600 dark:hover:text-gold-400">Gremios</Link>
            <Link to="/alianzas" className="hover:text-gold-600 dark:hover:text-gold-400">Alianzas</Link>
            <Link to="/eventos" className="hover:text-gold-600 dark:hover:text-gold-400">Eventos</Link>
            <Link to="/ranking" className="hover:text-gold-600 dark:hover:text-gold-400">Ranking</Link>
            <Link to="/buscar" className="hover:text-gold-600 dark:hover:text-gold-400">Buscar</Link>
            <Link to="/reglas" className="hover:text-gold-600 dark:hover:text-gold-400">Reglas</Link>
          </nav>
          <div className="flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400">
            Desarrollado con <Heart className="h-4 w-4 fill-gold-500 text-gold-500" /> por
            <span className="font-display font-semibold text-gold-600 dark:text-gold-400">Saaviier</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
