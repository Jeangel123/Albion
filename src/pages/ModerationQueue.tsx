import { useEffect, useState, useCallback } from 'react';
import { Flag, Check, X, Trash2, Ban, MessageSquare, User, Shield, AlertTriangle, Bot, Gavel, Undo2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Spinner, EmptyState } from '../components/ui';
import { isStaff, canSuspendUser } from '../lib/permissions';
import type { Profile } from '../lib/types';
import {
  REPORT_CATEGORIES, SANCTION_TYPES, AI_FLAG_CATEGORIES,
  issueSanction, logAction,
  type ReportCategory, type SanctionType, type Sanction, type AIFlag,
} from '../lib/moderation';

type Report = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  category: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter: Pick<Profile, 'username' | 'display_name'> | null;
};

type TabKey = 'abiertos' | 'resueltos' | 'sanciones' | 'ia';

export default function ModerationQueuePage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [sanctions, setSanctions] = useState<Sanction[] | null>(null);
  const [aiFlags, setAiFlags] = useState<AIFlag[] | null>(null);
  const [tab, setTab] = useState<TabKey>('abiertos');
  const [sanctionModal, setSanctionModal] = useState<{ userId: string; reportId?: string; username: string } | null>(null);

  const load = useCallback(async () => {
    if (!profile || !isStaff(profile.role)) return;
    const [rep, sanc, flags] = await Promise.all([
      supabase.from('reports')
        .select('*, reporter:profiles!reporter_id(username, display_name)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('sanctions')
        .select('*, issuer:profiles!issued_by(username, display_name), user:profiles!user_id(username, display_name)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('ai_flags').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setReports(rep.data as Report[] | null);
    setSanctions(sanc.data as unknown as Sanction[] | null);
    setAiFlags(flags.data as AIFlag[] | null);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function resolveReport(id: string) {
    const { error } = await supabase.from('reports').update({
      status: 'resolved',
      resolved_by: profile!.id,
      resolved_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return push({ type: 'error', message: error.message });
    setReports((r) => (r ?? []).map((x) => (x.id === id ? { ...x, status: 'resolved' } : x)));
    push({ type: 'success', message: 'Reporte resuelto' });
    await logAction(profile!.id, 'resolve_report', 'report', id, undefined, 'resolved');
  }

  async function dismissReport(id: string) {
    const { error } = await supabase.from('reports').update({
      status: 'dismissed',
      resolved_by: profile!.id,
      resolved_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return push({ type: 'error', message: error.message });
    setReports((r) => (r ?? []).map((x) => (x.id === id ? { ...x, status: 'dismissed' } : x)));
    push({ type: 'success', message: 'Reporte descartado' });
    await logAction(profile!.id, 'dismiss_report', 'report', id, undefined, 'dismissed');
  }

  async function deleteTarget(report: Report) {
    if (report.target_type === 'post') {
      const { error } = await supabase.from('posts').delete().eq('id', report.target_id);
      if (error) return push({ type: 'error', message: error.message });
      push({ type: 'success', message: 'Publicación eliminada' });
      await resolveReport(report.id);
      await logAction(profile!.id, 'delete_post_report', 'post', report.target_id, report.reason, 'deleted');
    }
  }

  async function handleIssueSanction(s: { userId: string; type: SanctionType; reason: string; durationHours?: number; reportId?: string }) {
    const { error } = await issueSanction({
      userId: s.userId,
      issuedBy: profile!.id,
      type: s.type,
      reason: s.reason,
      durationHours: s.durationHours,
      relatedReportId: s.reportId,
    });
    if (error) return push({ type: 'error', message: error });
    push({ type: 'success', message: 'Sanción aplicada' });
    setSanctionModal(null);
    load();
  }

  async function liftSanction(sanctionId: string, userId: string) {
    const { error } = await issueSanction({
      userId,
      issuedBy: profile!.id,
      type: 'unban',
      reason: 'Levantada por moderador',
    });
    if (error) return push({ type: 'error', message: error });
    await supabase.from('sanctions').update({ is_active: false }).eq('id', sanctionId);
    push({ type: 'success', message: 'Sanción levantada' });
    load();
  }

  async function resolveAIFlag(flag: AIFlag, status: 'reviewed' | 'dismissed' | 'actioned', notes?: string) {
    const { error } = await supabase.from('ai_flags').update({
      status,
      reviewed_by: profile!.id,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: notes ?? null,
    }).eq('id', flag.id);
    if (error) return push({ type: 'error', message: error.message });
    push({ type: 'success', message: 'Marca de IA revisada' });
    await logAction(profile!.id, 'review_ai_flag', 'ai_flag', flag.id, flag.flag_reason, status);
    load();
  }

  if (!profile || !isStaff(profile.role)) {
    return <EmptyState icon={Shield} title="Acceso restringido" hint="Solo moderadores y administradores." action={{ to: '/', label: 'Inicio' }} />;
  }

  const filteredReports = (reports ?? []).filter((r) =>
    tab === 'abiertos' ? r.status === 'open' : r.status !== 'open',
  );

  const activeSanctions = (sanctions ?? []).filter((s) => s.is_active);
  const pendingAIFlags = (aiFlags ?? []).filter((f) => f.status === 'pending');

  const targetIcon = (type: string) => {
    if (type === 'post') return MessageSquare;
    if (type === 'user') return User;
    return Flag;
  };

  const TABS: [TabKey, string, typeof Flag, number | undefined][] = [
    ['abiertos', 'Abiertos', Flag, reports?.filter((r) => r.status === 'open').length],
    ['resueltos', 'Resueltos', Check, undefined],
    ['sanciones', 'Sanciones', Gavel, activeSanctions.length || undefined],
    ['ia', 'Vaelyra IA', Bot, pendingAIFlags.length || undefined],
  ];

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-sky-100 p-3 dark:bg-sky-950">
          <Shield className="h-6 w-6 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Cola de moderación</h1>
          <p className="text-sm text-ink-500">Seguridad y normas del Reino</p>
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-ink-200 dark:border-ink-800">
        {TABS.map(([key, label, Icon, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium capitalize transition whitespace-nowrap ${tab === key ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'}`}
          >
            <Icon className="h-4 w-4" /> {label}
            {count !== undefined && count > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* === REPORTES === */}
      {(tab === 'abiertos' || tab === 'resueltos') && (
        !reports ? <Spinner /> : filteredReports.length === 0 ? (
          <EmptyState icon={Flag} title={tab === 'abiertos' ? 'Sin reportes abiertos' : 'Sin reportes resueltos'} />
        ) : (
          <div className="space-y-3">
            {filteredReports.map((r) => {
              const TargetIcon = targetIcon(r.target_type);
              const cat = REPORT_CATEGORIES.find((c) => c.key === r.category);
              return (
                <div key={r.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-ink-100 p-2 dark:bg-ink-800">
                      <TargetIcon className="h-4 w-4 text-ink-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-ink-500 capitalize">{r.target_type}</span>
                        {cat && (
                          <span className={`chip text-[10px] ${cat.color}`}>
                            {cat.emoji} {cat.label}
                          </span>
                        )}
                        <span className={`chip text-[10px] ${r.status === 'open' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-800 dark:text-ink-100">{r.reason}</p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {r.reporter?.display_name || r.reporter?.username || 'Anónimo'} · {new Date(r.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    {r.status === 'open' && (
                      <div className="flex flex-wrap gap-1">
                        {canSuspendUser(profile.role, { id: r.target_id, role: 'user', is_suspended: false } as Profile) && r.target_type === 'user' && (
                          <button
                            onClick={() => setSanctionModal({ userId: r.target_id, reportId: r.id, username: r.reporter?.username ?? 'usuario' })}
                            className="btn-ghost text-orange-600"
                            title="Sancionar usuario"
                          >
                            <Gavel className="h-4 w-4" />
                          </button>
                        )}
                        {r.target_type === 'post' && (
                          <button onClick={() => deleteTarget(r)} className="btn-ghost text-red-600" title="Eliminar contenido">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => resolveReport(r.id)} className="btn-ghost text-emerald-600" title="Resolver">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => dismissReport(r.id)} className="btn-ghost text-ink-500" title="Descartar">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* === SANCIONES === */}
      {tab === 'sanciones' && (
        !sanctions ? <Spinner /> : sanctions.length === 0 ? (
          <EmptyState icon={Gavel} title="Sin sanciones registradas" />
        ) : (
          <div className="space-y-3">
            {sanctions.map((s) => {
              const stype = SANCTION_TYPES.find((t) => t.key === s.type);
              const user = (s as any).user;
              return (
                <div key={s.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-ink-100 p-2 dark:bg-ink-800">
                      <AlertTriangle className="h-4 w-4 text-ink-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {stype && <span className={`chip text-[10px] ${stype.color}`}>{stype.emoji} {stype.label}</span>}
                        <span className={`chip text-[10px] ${s.is_active ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>
                          {s.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                        {user && <span className="text-xs text-ink-500">@{user.username}</span>}
                      </div>
                      {s.reason && <p className="mt-1 text-sm text-ink-800 dark:text-ink-100">{s.reason}</p>}
                      <p className="mt-0.5 text-xs text-ink-400">
                        {s.issuer?.display_name || s.issuer?.username || 'Sistema'} · {new Date(s.created_at).toLocaleDateString('es-ES')}
                        {s.expires_at && ` · expira ${new Date(s.expires_at).toLocaleDateString('es-ES')}`}
                      </p>
                    </div>
                    {s.is_active && s.type !== 'warning' && (
                      <button onClick={() => liftSanction(s.id, s.user_id)} className="btn-ghost text-emerald-600" title="Levantar sanción">
                        <Undo2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* === IA FLAGS (Vaelyra) === */}
      {tab === 'ia' && (
        !aiFlags ? <Spinner /> : aiFlags.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="Vaelyra no ha detectado contenido"
            hint="Cuando la IA esté activa, las marcas sospechosas aparecerán aquí para revisión humana."
          />
        ) : (
          <div className="space-y-3">
            {aiFlags.map((f) => {
              const cat = AI_FLAG_CATEGORIES.find((c) => c.key === f.category);
              return (
                <div key={f.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-950">
                      <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {cat && <span className="chip text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">{cat.emoji} {cat.label}</span>}
                        <span className={`chip text-[10px] ${f.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>
                          {f.status}
                        </span>
                        {f.confidence > 0 && (
                          <span className="text-[10px] text-ink-400">Confianza: {Math.round(f.confidence * 100)}%</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink-800 dark:text-ink-100">{f.flag_reason}</p>
                      {f.target_content && <p className="mt-1 truncate text-xs text-ink-500">"{f.target_content}"</p>}
                      <p className="mt-0.5 text-xs text-ink-400">{new Date(f.created_at).toLocaleString('es-ES')}</p>
                    </div>
                    {f.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => resolveAIFlag(f, 'actioned')} className="btn-ghost text-red-600" title="Acción tomada">
                          <Gavel className="h-4 w-4" />
                        </button>
                        <button onClick={() => resolveAIFlag(f, 'reviewed')} className="btn-ghost text-emerald-600" title="Revisada">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => resolveAIFlag(f, 'dismissed')} className="btn-ghost text-ink-500" title="Descartar">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {sanctionModal && (
        <SanctionModal
          username={sanctionModal.username}
          onClose={() => setSanctionModal(null)}
          onApply={(type, reason, hours) => handleIssueSanction({
            userId: sanctionModal.userId,
            type,
            reason,
            durationHours: hours,
            reportId: sanctionModal.reportId,
          })}
        />
      )}
    </div>
  );
}

function SanctionModal({
  username,
  onClose,
  onApply,
}: {
  username: string;
  onClose: () => void;
  onApply: (type: SanctionType, reason: string, durationHours?: number) => void;
}) {
  const [type, setType] = useState<SanctionType>('warning');
  const [reason, setReason] = useState('');
  const [hours, setHours] = useState(24);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 font-display text-lg font-semibold">Sancionar a @{username}</h3>
        <div className="space-y-4">
          <div>
            <label className="label">Tipo de sanción</label>
            <div className="grid grid-cols-2 gap-2">
              {SANCTION_TYPES.filter((t) => t.key !== 'unban').map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${type === t.key ? 'border-gold-500 bg-gold-50 text-gold-700 dark:bg-gold-950 dark:text-gold-300' : 'border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300'}`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
          {type === 'suspension' && (
            <div>
              <label className="label">Duración (horas)</label>
              <input type="number" min={1} value={hours} onChange={(e) => setHours(parseInt(e.target.value) || 1)} className="input" />
            </div>
          )}
          <div>
            <label className="label">Motivo</label>
            <textarea rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Razón de la sanción..." />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-ghost">Cancelar</button>
            <button onClick={() => onApply(type, reason, type === 'suspension' ? hours : undefined)} className="btn-primary">
              <Gavel className="h-4 w-4" /> Aplicar sanción
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
