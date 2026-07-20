import { useEffect, useState } from 'react';
import { Shield, Users, Flag, Newspaper, Settings, BarChart3, Megaphone, Wrench, Check, X, Trash2, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Spinner, EmptyState } from '../components/ui';
import type { Profile, Post, Guild, Alliance, AppConfig, Notification } from '../lib/types';

export default function AdminPage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState<'resumen' | 'publicaciones' | 'usuarios' | 'gremios' | 'alianzas' | 'reportes' | 'anuncios' | 'mantenimiento'>('resumen');
  const [stats, setStats] = useState<{ users: number; guilds: number; posts: number; reports: number } | null>(null);
  const [posts, setPosts] = useState<(Post & { author: Pick<Profile, 'username' | 'display_name'> })[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;
    (async () => {
      const [u, g, p, r] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('guilds').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id', { count: 'exact', head: true }),
      ]);
      setStats({ users: u.count ?? 0, guilds: g.count ?? 0, posts: p.count ?? 0, reports: r.count ?? 0 });
      const [{ data: postData }, { data: userData }, { data: guildData }, { data: allianceData }, { data: reportData }, { data: configData }] = await Promise.all([
        supabase.from('posts').select('*, author:profiles(username, display_name)').order('created_at', { ascending: false }).limit(30),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('guilds').select('*').order('created_at', { ascending: false }),
        supabase.from('alliances').select('*').order('created_at', { ascending: false }),
        supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('app_config').select('*').eq('id', 1).maybeSingle(),
      ]);
      setPosts(postData as any ?? []);
      setUsers(userData ?? []);
      setGuilds(guildData ?? []);
      setAlliances(allianceData ?? []);
      setReports(reportData ?? []);
      setConfig(configData as AppConfig | null);
      if (configData) { setAnnouncement((configData as AppConfig).announcement ?? ''); setMaintenanceMsg((configData as AppConfig).maintenance_message ?? ''); }
    })();
  }, [profile]);

  async function logAction(action: string, target_type?: string, target_id?: string, details?: string) {
    if (!profile) return;
    await supabase.from('audit_log').insert({ admin_id: profile.id, action, target_type, target_id, details });
  }

  async function deletePost(id: string) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) { setPosts((p) => p.filter((x) => x.id !== id)); push({ type: 'success', message: 'Publicación eliminada' }); logAction('delete_post', 'post', id); }
  }

  async function toggleSuspend(user: Profile) {
    const next = !user.is_suspended;
    const { error } = await supabase.from('profiles').update({ is_suspended: next }).eq('id', user.id);
    if (!error) { setUsers((u) => u.map((x) => x.id === user.id ? { ...x, is_suspended: next } : x)); push({ type: 'success', message: next ? 'Usuario suspendido' : 'Usuario reactivado' }); logAction(next ? 'suspend_user' : 'reactivate_user', 'profile', user.id, user.username); }
  }

  async function deleteGuild(g: Guild) {
    const { error } = await supabase.from('guilds').delete().eq('id', g.id);
    if (!error) { setGuilds((x) => x.filter((y) => y.id !== g.id)); push({ type: 'success', message: 'Gremio eliminado' }); logAction('delete_guild', 'guild', g.id, g.name); }
  }

  async function resolveReport(id: string) {
    const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', id);
    if (!error) { setReports((r) => r.map((x) => x.id === id ? { ...x, status: 'resolved' } : x)); push({ type: 'success', message: 'Reporte resuelto' }); logAction('resolve_report', 'report', id); }
  }

  async function sendAnnouncement() {
    if (!announcement.trim()) return push({ type: 'error', message: 'Escribe un anuncio' });
    const { error } = await supabase.from('app_config').update({ announcement, announcement_active: true }).eq('id', 1);
    if (!error) { push({ type: 'success', message: 'Anuncio publicado' }); logAction('send_announcement', 'app_config', undefined, announcement); }
  }

  async function toggleMaintenance() {
    if (!config) return;
    const next = !config.maintenance_mode;
    const { error } = await supabase.from('app_config').update({ maintenance_mode: next, maintenance_message: maintenanceMsg }).eq('id', 1);
    if (!error) { setConfig({ ...config, maintenance_mode: next, maintenance_message: maintenanceMsg }); push({ type: 'success', message: next ? 'Modo mantenimiento activado' : 'Modo mantenimiento desactivado' }); logAction(next ? 'enable_maintenance' : 'disable_maintenance', 'app_config'); }
  }

  if (!profile || profile.role !== 'admin') {
    return <EmptyState icon={Shield} title="Acceso restringido" hint="Solo administradores." action={{ to: '/', label: 'Inicio' }} />;
  }

  const TABS: [typeof tab, string, typeof Shield][] = [
    ['resumen', 'Resumen', BarChart3], ['publicaciones', 'Publicaciones', Newspaper], ['usuarios', 'Usuarios', Users],
    ['gremios', 'Gremios', Shield], ['alianzas', 'Alianzas', Shield], ['reportes', 'Reportes', Flag],
    ['anuncios', 'Anuncios', Megaphone], ['mantenimiento', 'Mantenimiento', Wrench],
  ];

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-gold-100 p-3 dark:bg-gold-950"><Shield className="h-6 w-6 text-gold-600 dark:text-gold-400" /></div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Panel de administración</h1>
          <p className="text-sm text-ink-500">Gestión de la plataforma</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="card h-fit p-2">
          {TABS.map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${tab === key ? 'bg-gold-100 text-gold-700 dark:bg-gold-950 dark:text-gold-300' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'resumen' && stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Users} label="Usuarios" value={stats.users} />
              <StatCard icon={Shield} label="Gremios" value={stats.guilds} />
              <StatCard icon={Newspaper} label="Publicaciones" value={stats.posts} />
              <StatCard icon={Flag} label="Reportes" value={stats.reports} />
            </div>
          )}
          {tab === 'publicaciones' && (
            <div className="card divide-y divide-ink-100 dark:divide-ink-800">
              {posts.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin publicaciones.</p> : posts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-500">{p.author?.display_name || p.author?.username}</p>
                    <p className="truncate text-sm">{p.content || `[${p.type}]`}</p>
                  </div>
                  <button onClick={() => deletePost(p.id)} className="btn-ghost text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
          {tab === 'usuarios' && (
            <div className="card divide-y divide-ink-100 dark:divide-ink-800">
              {users.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin usuarios.</p> : users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{u.display_name || u.username}</p>
                    <p className="text-xs text-ink-500">@{u.username} {u.is_suspended && '· suspendido'} {u.role === 'admin' && '· admin'}</p>
                  </div>
                  <button onClick={() => toggleSuspend(u)} className={`btn-ghost ${u.is_suspended ? 'text-emerald-600' : 'text-red-600'}`}>
                    {u.is_suspended ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
          {tab === 'gremios' && (
            <div className="card divide-y divide-ink-100 dark:divide-ink-800">
              {guilds.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin gremios.</p> : guilds.map((g) => (
                <div key={g.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{g.name}</p><p className="text-xs text-ink-500">{g.member_count} miembros</p></div>
                  <button onClick={() => deleteGuild(g)} className="btn-ghost text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
          {tab === 'alianzas' && (
            <div className="card divide-y divide-ink-100 dark:divide-ink-800">
              {alliances.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin alianzas.</p> : alliances.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{a.name}</p></div>
                  <button onClick={async () => { await supabase.from('alliances').delete().eq('id', a.id); setAlliances((x) => x.filter((y) => y.id !== a.id)); push({ type: 'success', message: 'Alianza eliminada' }); logAction('delete_alliance', 'alliance', a.id, a.name); }} className="btn-ghost text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
          {tab === 'reportes' && (
            <div className="card divide-y divide-ink-100 dark:divide-ink-800">
              {reports.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin reportes.</p> : reports.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-500">{r.target_type} · {r.status}</p>
                    <p className="truncate text-sm">{r.reason}</p>
                  </div>
                  {r.status === 'open' && <button onClick={() => resolveReport(r.id)} className="btn-ghost text-emerald-600"><Check className="h-4 w-4" /></button>}
                </div>
              ))}
            </div>
          )}
          {tab === 'anuncios' && (
            <div className="card space-y-4 p-5">
              <div><label className="label">Anuncio global</label><textarea rows={3} className="input" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="Escribe un anuncio para toda la comunidad..." /></div>
              <button onClick={sendAnnouncement} className="btn-primary"><Megaphone className="h-4 w-4" /> Publicar anuncio</button>
            </div>
          )}
          {tab === 'mantenimiento' && config && (
            <div className="card space-y-4 p-5">
              <div className="flex items-center justify-between rounded-xl bg-ink-100 p-4 dark:bg-ink-800">
                <div><p className="font-medium">Modo mantenimiento</p><p className="text-xs text-ink-500">{config.maintenance_mode ? 'Activo' : 'Inactivo'}</p></div>
                <button onClick={toggleMaintenance} className={config.maintenance_mode ? 'btn-outline text-red-600' : 'btn-primary'}>{config.maintenance_mode ? 'Desactivar' : 'Activar'}</button>
              </div>
              <div><label className="label">Mensaje de mantenimiento</label><textarea rows={2} className="input" value={maintenanceMsg} onChange={(e) => setMaintenanceMsg(e.target.value)} placeholder="Estamos mejorando Imperio..." /></div>
              <p className="text-xs text-ink-500">Las actualizaciones se instalan sin afectar los datos de los usuarios.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gold-100 p-2.5 dark:bg-gold-950"><Icon className="h-5 w-5 text-gold-600 dark:text-gold-400" /></div>
        <div><p className="text-2xl font-display font-bold">{value}</p><p className="text-xs text-ink-500">{label}</p></div>
      </div>
    </div>
  );
}
