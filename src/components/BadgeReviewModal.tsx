import { useEffect, useState } from 'react';
import { X, Award, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { requestBadgeReview, BOOST_PRICES } from '../lib/economy';
import type { Badge, BadgeReviewRequest } from '../lib/types';

export function BadgeReviewModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [requests, setRequests] = useState<BadgeReviewRequest[]>([]);
  const [badgeId, setBadgeId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      const [b, r] = await Promise.all([
        supabase.from('badges').select('*').order('name'),
        supabase.from('badge_review_requests').select('*, badge:badges(*)').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);
      if (b.data) setBadges(b.data as Badge[]);
      if (r.data) setRequests(r.data as BadgeReviewRequest[]);
    })();
  }, [userId]);

  async function submit() {
    if (!badgeId || !reason.trim()) return push({ type: 'info', message: 'Selecciona una insignia y escribe el motivo' });
    setSubmitting(true);
    const { error } = await requestBadgeReview(userId, badgeId, reason.trim());
    setSubmitting(false);
    if (error) return push({ type: 'error', message: error });
    push({ type: 'success', message: `Solicitud enviada (-${BOOST_PRICES.badge_review} silver)` });
    setReason('');
    const { data } = await supabase.from('badge_review_requests').select('*, badge:badges(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setRequests(data as BadgeReviewRequest[]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold"><Award className="h-5 w-5 text-gold-500" /> Solicitar revisión de insignia</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        <p className="mb-3 text-xs text-ink-500">Costo: {BOOST_PRICES.badge_review} silver. El staff revisará tu solicitud.</p>

        <label className="label">Insignia</label>
        <select className="input mb-3" value={badgeId} onChange={(e) => setBadgeId(e.target.value)}>
          <option value="">Selecciona...</option>
          {badges.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <label className="label">Motivo</label>
        <textarea className="input mb-3 min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="¿Por qué mereces esta insignia?" />

        <button onClick={submit} disabled={submitting} className="btn-primary w-full">
          <Send className="h-4 w-4" /> {submitting ? 'Enviando...' : `Enviar solicitud (${BOOST_PRICES.badge_review} silver)`}
        </button>

        {requests.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Mis solicitudes</p>
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-900">
                <span className="text-sm">{r.badge?.name ?? 'Insignia'}</span>
                <span className={`chip text-[10px] ${r.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : r.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                  {r.status === 'pending' ? 'Pendiente' : r.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
