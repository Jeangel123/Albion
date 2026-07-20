import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Coins, TrendingUp } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useWallet } from '../lib/useWallet';
import { useReputation } from '../lib/useReputation';
import { Spinner, EmptyState } from '../components/ui';
import { RankProgress } from '../components/RankBadge';

export default function WalletPage() {
  const { profile } = useAuth();
  const { wallet, transactions, loading } = useWallet();
  const { log } = useReputation();

  if (!profile) {
    return <EmptyState icon={WalletIcon} title="Inicia sesión" hint="Necesitas una cuenta para ver tu monedero." action={{ to: '/login', label: 'Iniciar sesión' }} />;
  }

  if (loading) return <Spinner className="py-20" />;

  const balance = wallet?.balance ?? 0;
  const totalEarned = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="container-app max-w-4xl py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-gold-100 p-3 dark:bg-gold-950">
          <WalletIcon className="h-6 w-6 text-gold-600 dark:text-gold-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Monedero</h1>
          <p className="text-sm text-ink-500">Tu saldo e historial de transacciones</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card bg-gradient-to-br from-gold-500 to-gold-700 p-5 text-white">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            <span className="text-sm font-medium opacity-90">Saldo actual</span>
          </div>
          <p className="mt-2 font-display text-4xl font-bold">{balance}</p>
          <p className="mt-1 text-xs opacity-75">monedas de oro</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-ink-500">Ganado</span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">{totalEarned}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-rose-500" />
            <span className="text-sm font-medium text-ink-500">Gastado</span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-rose-600">{totalSpent}</p>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <TrendingUp className="h-5 w-5 text-gold-500" /> Progreso de rango
        </h2>
        <RankProgress points={profile.reputation_points} />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold">Historial de transacciones</h2>
        {transactions.length === 0 ? (
          <EmptyState icon={WalletIcon} title="Sin transacciones" hint="Gana monedas participando en la comunidad." />
        ) : (
          <div className="card divide-y divide-ink-100 dark:divide-ink-800">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-4">
                <div className={`rounded-lg p-2 ${t.amount > 0 ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-rose-100 dark:bg-rose-950'}`}>
                  {t.amount > 0 ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 text-rose-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description ?? t.reference ?? 'Transacción'}</p>
                  <p className="text-xs text-ink-500">{new Date(t.created_at).toLocaleString('es-ES')}</p>
                </div>
                <span className={`font-display font-bold ${t.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.amount > 0 ? '+' : ''}{t.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {log.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-lg font-semibold">Registro de reputación</h2>
          <div className="card divide-y divide-ink-100 dark:divide-ink-800">
            {log.slice(0, 10).map((l) => (
              <div key={l.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium capitalize">{l.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-ink-500">{new Date(l.created_at).toLocaleString('es-ES')}</p>
                </div>
                <span className="font-display font-bold text-gold-600">+{l.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
