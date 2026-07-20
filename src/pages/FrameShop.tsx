import { useState } from 'react';
import { ShoppingBag, Check, Lock, Sparkles, Coins, Plus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { useFrames } from '../lib/useFrames';
import { useWallet } from '../lib/useWallet';
import { useRank } from '../lib/useRank';
import { purchaseFrame, claimFreeFrame } from '../lib/economy';
import { Spinner, EmptyState } from '../components/ui';
import { FRAME_RARITIES, MEDIEVAL_RANKS, type FrameRarity, type MedievalRank } from '../lib/types';

export default function FrameShopPage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const { catalog, owned, equippedFrame, isOwned, equip, unequip, loading } = useFrames();
  const { wallet } = useWallet();
  const { rank } = useRank();
  const [buying, setBuying] = useState<string | null>(null);

  if (!profile) {
    return <EmptyState icon={ShoppingBag} title="Inicia sesión" hint="Necesitas una cuenta para comprar marcos." action={{ to: '/login', label: 'Iniciar sesión' }} />;
  }

  if (loading) return <Spinner className="py-20" />;

  const balance = wallet?.balance ?? 0;
  const ownedFrameIds = new Set(owned.map((f) => f.frame_id));

  async function handleBuy(frameId: string, price: number, isFree: boolean) {
    setBuying(frameId);
    const result = isFree
      ? await claimFreeFrame(profile!.id, frameId)
      : await purchaseFrame(profile!.id, frameId, price);
    setBuying(null);
    if (result.error) {
      push({ type: 'error', message: result.error });
    } else {
      push({ type: 'success', message: isFree ? 'Marco reclamado' : 'Marco comprado' });
    }
  }

  async function handleEquip(userFrameId: string) {
    const { error } = await equip(userFrameId);
    if (error) push({ type: 'error', message: error });
    else push({ type: 'success', message: 'Marco equipado' });
  }

  async function handleUnequip() {
    const { error } = await unequip();
    if (error) push({ type: 'error', message: error });
    else push({ type: 'success', message: 'Marco retirado' });
  }

  function isUnlocked(unlockCondition: string | null): boolean {
    if (!unlockCondition) return true;
    if (unlockCondition.toLowerCase().includes('todos')) return true;
    const rankMatch = MEDIEVAL_RANKS.find((r) => unlockCondition.toLowerCase().includes(r.key));
    if (rankMatch) {
      const rankIdx = MEDIEVAL_RANKS.findIndex((r) => r.key === rank.key);
      const requiredIdx = MEDIEVAL_RANKS.findIndex((r) => r.key === rankMatch.key);
      return rankIdx >= requiredIdx;
    }
    return false;
  }

  const sorted = [...catalog].sort((a, b) => {
    const rarityOrder: FrameRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
  });

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gold-100 p-3 dark:bg-gold-950">
            <ShoppingBag className="h-6 w-6 text-gold-600 dark:text-gold-400" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Tienda de marcos</h1>
            <p className="text-sm text-ink-500">Personaliza tu avatar con marcos únicos</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-ink-100 px-4 py-2 dark:bg-ink-800">
          <Coins className="h-5 w-5 text-gold-500" />
          <span className="font-display text-lg font-bold">{balance}</span>
        </div>
      </div>

      {equippedFrame && (
        <div className="card mb-6 flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-gold-500" />
            <div>
              <p className="text-sm font-medium">Marco equipado</p>
              <p className="text-xs text-ink-500">{catalog.find((f) => f.id === equippedFrame.frame_id)?.name ?? 'Desconocido'}</p>
            </div>
          </div>
          <button onClick={handleUnequip} className="btn-outline text-sm">Retirar</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((frame) => {
          const isOwnedFrame = ownedFrameIds.has(frame.id);
          const userFrame = owned.find((f) => f.frame_id === frame.id);
          const isEquipped = userFrame?.is_equipped ?? false;
          const canAfford = balance >= frame.price;
          const unlocked = isUnlocked(frame.unlock_condition);
          const rarityMeta = FRAME_RARITIES.find((r) => r.key === frame.rarity);
          const rarityCls: Record<FrameRarity, string> = {
            common: 'border-ink-300 dark:border-ink-700',
            uncommon: 'border-emerald-400 dark:border-emerald-600',
            rare: 'border-sky-400 dark:border-sky-600',
            epic: 'border-violet-400 dark:border-violet-600',
            legendary: 'border-amber-400 dark:border-amber-600',
            mythic: 'border-rose-400 dark:border-rose-600',
          };

          return (
            <div key={frame.id} className={`card card-glow fade-in-up overflow-hidden border-2 ${rarityCls[frame.rarity]} p-0`} style={{ animationDelay: `${sorted.indexOf(frame) * 0.05}s` }}>
              <div className="relative flex items-center justify-center bg-gradient-to-br from-ink-50 to-ink-100 py-8 dark:from-ink-900 dark:to-ink-950">
                {frame.rarity === 'legendary' && <div className="absolute inset-0 shimmer-gold opacity-30" />}
                <div className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-ink-200 dark:bg-ink-800 ${rarityMeta ? `ring-2 ${rarityMeta.color}` : ''} ${frame.rarity === 'mythic' ? 'pulse-glow-mythic' : frame.rarity === 'legendary' ? 'pulse-glow' : ''}`}>
                  <span className="text-4xl transition-transform hover:scale-110">{frame.icon ?? '🖼️'}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold">{frame.name}</h3>
                  <span className={`chip text-[10px] ${rarityMeta?.color ?? ''}`}>{rarityMeta?.label ?? frame.rarity}</span>
                </div>
                {frame.description && <p className="mt-1 text-xs text-ink-500">{frame.description}</p>}
                {frame.unlock_condition && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-400">
                    {unlocked ? <Check className="h-3 w-3 text-emerald-500" /> : <Lock className="h-3 w-3" />}
                    {frame.unlock_condition}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  {frame.is_free ? (
                    <span className="text-sm font-semibold text-emerald-600">Gratis</span>
                  ) : (
                    <span className="flex items-center gap-1 font-display font-bold">
                      <Coins className="h-4 w-4 text-gold-500" /> {frame.price}
                    </span>
                  )}
                  <div>
                    {isEquipped ? (
                      <span className="chip bg-gold-100 text-gold-700 dark:bg-gold-950 dark:text-gold-300">Equipado</span>
                    ) : isOwnedFrame && userFrame ? (
                      <button onClick={() => handleEquip(userFrame.id)} className="btn-outline text-sm">Equipar</button>
                    ) : !unlocked ? (
                      <button disabled className="btn-ghost cursor-not-allowed text-sm opacity-50">Bloqueado</button>
                    ) : (
                      <button
                        onClick={() => handleBuy(frame.id, frame.price, frame.is_free)}
                        disabled={buying === frame.id || (!canAfford && !frame.is_free)}
                        className="btn-primary text-sm"
                      >
                        {buying === frame.id ? '...' : frame.is_free ? <><Plus className="h-4 w-4" /> Reclamar</> : 'Comprar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
