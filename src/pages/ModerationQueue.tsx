import { useEffect, useState } from 'react';
import { Flag, Check, X, Trash2, Ban, MessageSquare, User, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Spinner, EmptyState } from '../components/ui';
import { isStaff } from '../lib/permissions';
import type { Profile, Post } from '../lib/types';

type Report = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: Pick<Profile, 'username' | 'display_name'> | null;
};

export default function ModerationQueuePage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [tab, setTab] = useState<'abiertos' | 'resueltos'>('abiertos');

  useEffect(() => {
    if (!profile || !isStaff(profile.role)) return;
    (async () => {
      const { data } = await supabase
        .from('reports')
        .select('*, reporter:profiles!reporter_id(username, display_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      setReports(data as Report[] | null);
    })();
  }, [profile]);

  async function resolveReport(id: string) {
    const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', id);
    if (error) return push({ type: 'error', message: error.message });
    setReports((r) => (r ?? []).map((x) => (x.id === id ? { ...x, status: 'resolved' } : x)));
    push({ type: 'success', message: 'Reporte resuelto' });
    await supabase.from('audit_log').insert({ admin_id: profile!.id, action: 'resolve_report', target_type: 'report', target_id: id });
  }

  async function dismissReport(id: string) {
    const { error } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', id);
    if (error) return push({ type: 'error', message: error.message });
    setReports((r) => (r ?? []).map((x) => (x.id === id ? { ...x, status: 'dismissed' } : x)));
    push({ type: 'success', message: 'Reporte descartado' });
    await supabase.from('audit_log').insert({ admin_id: profile!.id, action: 'dismiss_report', target_type: 'report', target_id: id });
  }

  async function deleteTarget(report: Report) {
    if (report.target_type === 'post') {
      const { error } = await supabase.from('posts').delete().eq('id', report.target_id);
      if (error) return push({ type: 'error', message: error.message });
      push({ type: 'success', message: 'Publicación eliminada' });
      await resolveReport(report.id);
      await supabase.from('audit_log').insert({
        admin_id: profile!.id,
        action: 'delete_post_report',
        target_type: 'post',
        target_id: report.target_id,
        details: report.reason,
      });
    }
  }

  if (!profile || !isStaff(profile.role)) {
    return <EmptyState icon={Shield} title="Acceso restringido" hint="Solo moderadores y administradores." action={{ to: '/', label: 'Inicio' }} />;
  }

  const filtered = (reports ?? []).filter((r) =>
    tab === 'abiertos' ? r.status === 'open' : r.status !== 'open'
  );

  const targetIcon = (type: string) => {
    if (type === 'post') return MessageSquare;
    if (type === 'user') return User;
    return Flag;
  };

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-sky-100 p-3 dark:bg-sky-950">
          <Flag className="h-6 w-6 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Cola de moderación</h1>
          <p className="text-sm text-ink-500">Reportes de la comunidad</p>
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-ink-200 dark:border-ink-800">
        {(['abiertos', 'resueltos'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-gold-500 text-gold-600 dark:text-gold-400' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {!reports ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Flag} title={tab === 'abiertos' ? 'Sin reportes abiertos' : 'Sin reportes resueltos'} />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const TargetIcon = targetIcon(r.target_type);
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-ink-100 p-2 dark:bg-ink-800">
                    <TargetIcon className="h-4 w-4 text-ink-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-ink-500 capitalize">{r.target_type}</span>
                      <span className={`chip text-[10px] ${r.status === 'open' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-800 dark:text-ink-100">{r.reason}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {r.reporter?.display_name || r.reporter?.username || 'Anónimo'} · {new Date(r.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  {r.status === 'open' && (
                    <div className="flex gap-1">
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
      )}
    </div>
  );
}
