import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Bell, Home, Users, Shield, Calendar, Trophy, MessageSquare, Menu, X, Sun, Moon, Plus, Settings, LogOut, User as UserIcon, Castle, ShoppingBag, Wallet as WalletIcon, Lightbulb, Globe,
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { Logo } from './Logo';
import { Avatar } from './Avatar';

const NAV = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/gremios', labelKey: 'nav.guilds', icon: Users },
  { to: '/comunidades', labelKey: 'nav.communities', icon: Castle },
  { to: '/alianzas', labelKey: 'nav.alliances', icon: Shield },
  { to: '/eventos', labelKey: 'nav.events', icon: Calendar },
  { to: '/ranking', labelKey: 'nav.rankings', icon: Trophy },
  { to: '/consejo', labelKey: 'nav.council', icon: Lightbulb },
  { to: '/mensajes', labelKey: 'nav.chat', icon: Globe, authOnly: true },
  { to: '/buscar', labelKey: 'nav.search', icon: Search },
];

export function Navbar() {
  const { theme, toggle } = useTheme();
  const { profile, session, signOut } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/buscar?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gold-200/30 bg-white/85 backdrop-blur-xl dark:border-gold-900/30 dark:bg-ink-950/85">
      <div className="container-app flex h-16 items-center gap-3">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.filter((n) => !n.authOnly || session).map((n) => {
            const active = location.pathname === n.to || (n.to !== '/' && location.pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`nav-link ${active ? 'nav-link-active' : ''}`}
              >
                {t(n.labelKey as any)}
              </Link>
            );
          })}
        </nav>
          <form onSubmit={submitSearch} className="hidden md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('nav.search') + "..."}
                className="w-56 rounded-xl border border-ink-200 bg-ink-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-gold-400 focus:bg-white dark:border-ink-700 dark:bg-ink-900 dark:focus:bg-ink-900"
              />
            </div>
          </form>
          <button onClick={toggle} className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800" aria-label="Tema">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {session ? (
            <>
              <Link to="/notificaciones" className="relative rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">
                <Bell className="h-5 w-5" />
              </Link>
              <Link to="/mensajes" className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">
                <MessageSquare className="h-5 w-5" />
              </Link>
              <div className="relative">
                <button onClick={() => setMenuOpen((p) => !p)} className="rounded-full">
                  <Avatar src={profile?.avatar_url} alt={profile?.username ?? ''} size="sm" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-56 card p-1.5 animate-slide-up">
                      <div className="border-b border-ink-100 px-3 py-2.5 dark:border-ink-800">
                        <p className="truncate text-sm font-semibold">{profile?.display_name || profile?.username || 'Usuario'}</p>
                        <p className="truncate text-xs text-ink-500">@{profile?.username ?? ''}</p>
                      </div>
                      {profile && <MenuItem to={`/perfil/${profile.username}`} icon={UserIcon} label={t('nav.profile')} onClick={() => setMenuOpen(false)} />}
                      <MenuItem to="/crear-publicacion" icon={Plus} label={t('nav.post')} onClick={() => setMenuOpen(false)} />
                      <MenuItem to="/tienda" icon={ShoppingBag} label={t('nav.shop')} onClick={() => setMenuOpen(false)} />
                      <MenuItem to="/monedero" icon={WalletIcon} label={t('nav.wallet')} onClick={() => setMenuOpen(false)} />
                      <MenuItem to="/consejo" icon={Lightbulb} label={t('council.title')} onClick={() => setMenuOpen(false)} />
                      <MenuItem to="/ajustes" icon={Settings} label={t('nav.settings')} onClick={() => setMenuOpen(false)} />
                      {(profile?.role === 'admin' || profile?.role === 'supreme_admin' || profile?.role === 'moderator') && (
                        <MenuItem to="/admin" icon={Shield} label={t('nav.admin')} onClick={() => setMenuOpen(false)} />
                      )}
                      <button
                        onClick={() => { signOut(); setMenuOpen(false); navigate('/'); }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
                      >
                        <LogOut className="h-4 w-4" /> {t('nav.logout')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn-ghost">{t('nav.login')}</Link>
              <Link to="/registro" className="btn-primary">{t('nav.register')}</Link>
            </div>
          )}
          <button onClick={() => setOpen((p) => !p)} className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden dark:text-ink-300 dark:hover:bg-ink-800">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
      </div>
      {open && (
        <div className="border-t border-ink-200 bg-white lg:hidden dark:border-ink-800 dark:bg-ink-950">
          <div className="container-app space-y-1 py-3">
            <form onSubmit={submitSearch}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('nav.search') + "..."}
                  className="input pl-9"
                />
              </div>
            </form>
            {NAV.filter((n) => !n.authOnly || session).map((n) => {
              const active = location.pathname === n.to || (n.to !== '/' && location.pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-gold-50 text-gold-600 dark:bg-gold-950/30 dark:text-gold-300' : 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800'}`}
                >
                  <n.icon className="h-4 w-4" /> {t(n.labelKey as any)}
                </Link>
              );
            })}
            {!session && (
              <div className="flex gap-2 pt-2">
                <Link to="/login" onClick={() => setOpen(false)} className="btn-outline flex-1">{t('nav.login')}</Link>
                <Link to="/registro" onClick={() => setOpen(false)} className="btn-primary flex-1">{t('nav.register')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MenuItem({ to, icon: Icon, label, onClick }: { to: string; icon: typeof Home; label: string; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}
