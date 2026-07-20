import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { useAuth } from '../lib/auth';
import { REPORT_CATEGORIES, createReport, type ReportCategory } from '../lib/moderation';

export function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  targetType: string;
  targetId: string;
}) {
  const { profile } = useAuth();
  const { push } = useToast();
  const [category, setCategory] = useState<ReportCategory>('inappropriate');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!profile) return;
    if (!reason.trim()) return push({ type: 'error', message: 'Describe el motivo del reporte' });
    setSending(true);
    const { error } = await createReport(profile.id, targetType, targetId, reason, category);
    setSending(false);
    if (error) return push({ type: 'error', message: error });
    push({ type: 'success', message: 'Reporte enviado. Gracias por ayudar a mantener el Reino seguro.' });
    setReason('');
    setCategory('inappropriate');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Reportar contenido">
      <div className="space-y-4">
        <div>
          <label className="label">Categoría</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {REPORT_CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${category === c.key ? 'border-gold-500 bg-gold-50 text-gold-700 dark:bg-gold-950 dark:text-gold-300' : 'border-ink-200 text-ink-600 hover:border-ink-300 dark:border-ink-700 dark:text-ink-300'}`}
              >
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Detalles</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="input"
            placeholder="Describe qué infringe las normas..."
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={submit} disabled={sending} className="btn-primary">
            <Flag className="h-4 w-4" /> {sending ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
