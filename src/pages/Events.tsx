import { useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, MapPin, Clock, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { Spinner, EmptyState } from '../components/ui';
import { EVENT_TYPES, type AlbionEvent } from '../lib/types';
import { formatDateTime } from '../lib/format';

export default function EventsPage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const [events, setEvents] = useState<AlbionEvent[] | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [attendees, setAttendees] = useState<Record<string, number>>({});

  async function load() {
    const { data, error } = await supabase.from('events').select('*').gte('start_time', new Date(Date.now() - 86400000).toISOString()).order('start_time', { ascending: true });
    if (error) console.error('[events] load:', error.message);
    setEvents(data ?? []);
    if (data) {
      const counts: Record<string, number> = {};
      await Promise.all(data.map(async (ev) => {
        const { count, error: cErr } = await supabase.from('event_attendees').select('id', { count: 'exact', head: true }).eq('event_id', ev.id);
        if (cErr) console.error('[events] count:', cErr.message);
        counts[ev.id] = count ?? 0;
      }));
      setAttendees(counts);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => filter === 'all' ? (events ?? []) : (events ?? []).filter((e) => e.type === filter), [events, filter]);

  async function attend(ev: AlbionEvent) {
    if (!profile) return push({ type: 'info', message: 'Inicia sesión' });
    const { data } = await supabase.from('event_attendees').select('id').eq('event_id', ev.id).eq('user_id', profile.id).maybeSingle();
    if (data) {
      await supabase.from('event_attendees').delete().eq('event_id', ev.id).eq('user_id', profile.id);
      setAttendees((p) => ({ ...p, [ev.id]: Math.max(0, (p[ev.id] ?? 0) - 1) }));
    } else {
      await supabase.from('event_attendees').insert({ event_id: ev.id, user_id: profile.id });
      setAttendees((p) => ({ ...p, [ev.id]: (p[ev.id] ?? 0) + 1 }));
    }
  }

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Eventos</h1>
          <p className="text-sm text-ink-500">Calendario de actividades de gremios</p>
        </div>
        {profile && <button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Crear evento</button>}
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        <button onClick={() => setFilter('all')} className={`chip ${filter === 'all' ? 'bg-gold-500 text-ink-950' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>Todos</button>
        {EVENT_TYPES.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={`chip ${filter === t.key ? 'bg-gold-500 text-ink-950' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            <span className={`h-2 w-2 rounded-full ${t.color}`} /> {t.label}
          </button>
        ))}
      </div>

      {!events ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon={Calendar} title="No hay eventos" hint="Crea o asiste a un evento." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ev) => {
            const t = EVENT_TYPES.find((x) => x.key === ev.type);
            return (
              <div key={ev.id} className="card p-4 card-hover">
                <div className="flex items-center justify-between">
                  <span className={`chip text-white ${t?.color ?? 'bg-gold-500'}`}>{t?.label ?? ev.type}</span>
                  <span className="text-xs text-ink-500">{formatDateTime(ev.start_time)}</span>
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold">{ev.title}</h3>
                {ev.description && <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{ev.description}</p>}
                <div className="mt-3 flex items-center gap-3 text-xs text-ink-500">
                  {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ev.location}</span>}
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {attendees[ev.id] ?? 0}</span>
                </div>
                {profile && <button onClick={() => attend(ev)} className="btn-outline mt-3 w-full">Asistir</button>}
              </div>
            );
          })}
        </div>
      )}

      {createOpen && <CreateEventModal onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} />}
    </div>
  );
}

function CreateEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({ title: '', description: '', type: 'zvz', start_time: '', end_time: '', location: '' });
  const [saving, setSaving] = useState(false);

  if (!profile) { onClose(); return null; }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.start_time) return push({ type: 'error', message: 'Título y fecha son obligatorios' });
    setSaving(true);
    const { error } = await supabase.from('events').insert({
      author_id: profile!.id,
      title: form.title,
      description: form.description || null,
      type: form.type,
      start_time: new Date(form.start_time).toISOString(),
      end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      location: form.location || null,
    });
    setSaving(false);
    if (error) return push({ type: 'error', message: error.message });
    push({ type: 'success', message: 'Evento creado' });
    onCreated();
  }

  return (
    <Modal open onClose={onClose} title="Crear evento">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Título *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="label">Tipo</label>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {EVENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div><label className="label">Descripción</label><textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Inicio *</label><input type="datetime-local" className="input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
          <div><label className="label">Fin</label><input type="datetime-local" className="input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
        </div>
        <div><label className="label">Ubicación</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ej: Caerleon, Avalon" /></div>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-ghost">Cancelar</button><button disabled={saving} className="btn-primary">{saving ? 'Creando...' : 'Crear'}</button></div>
      </form>
    </Modal>
  );
}
