import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Users, Flag, Newspaper, BarChart3, Megaphone, Wrench, Check, X, Trash2, Ban,
  Crown, Gavel, FileText, ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Spinner, EmptyState } from '../components/ui';
import { RankBadge, RoleBadge } from '../components/RankBadge';
import { isAdmin, isSupremeAdmin, isStaff, canSuspendUser } from '../lib/permissions';
import type { Profile, Post, Guild, Alliance, AppConfig } from '../lib/types';

export default function AdminPage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState<'resumen' | 'publicaciones' | 'usuarios' | 'gremios' | 'alianzas' | 'reportes' | 'auditoria' | 'anuncios' | 'mantenimiento'>('resumen');
  const [stats, setStats] = useState<{ users: number; guilds: number; posts: number; reports: number } | null>(null);
  const [posts, setPosts] = useState<(Post & { author: Pick<Profile, 'username' | 'display_name' | 'medieval_rank' | 'role'> })[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  useEffect(() => {
    if (!profile || !isStaff(profile.role)) return;
    (async () => {
      const [u, g, p, r] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('guilds').select('id', { count: 'exact', head: true }),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id', { count: 'exact', head: true }),
      ]);
      setStats({ users: u.count ?? 0, guilds: g.count ?? 0, posts: p.count ?? 0, reports: r.count ?? 0 });
      const [postData, userData, guildData, allianceData, configData] = await Promise.all([
        supabase.from('posts').select('*, author:profiles(username, display_name, medieval_rank, role)').order('created_at', { ascending: false }).limit(30),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('guilds').select('*').order('created_at', { ascending: false }),
        supabase.from('alliances').select('*').order('created_at', { ascending: false }),
        supabase.from('app_config').select('*').eq('id', 1).maybeSingle(),
      ]);
      setPosts((postData.data ?? []) as any);
      setUsers(userData.data ?? []);
      setGuilds(guildData.data ?? []);
      setAlliances(allianceData.data ?? []);
      setConfig(configData.data as AppConfig | null);
      if (configData.data) {
        const cfg = configData.data as AppConfig;
        setAnnouncement(cfg.announcement ?? '');
        setMaintenanceMsg(cfg.maintenance_message ?? '');
      }
      if (isAdmin(profile.role)) {
        const { data: logs } = await supabase
          .from('audit_log')
          .select('*, admin:profiles!admin_id(username, display_name)')
          .order('created_at', { ascending: false })
          .limit(50);
        setAuditLogs(logs ?? []);
      }
    })();
  }, [profile]);

  async function logAction(action: string, target_type?: string, target_id?: string, details?: string) {
    if (!profile) return;
    await supabase.from('audit_log').insert({ admin_id: profile.id, action, target_type, target_id, details });
  }

  async function deletePost(id: string) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) return push({ type: 'error', message: error.message });
    setPosts((p) => p.filter((x) => x.id !== id));
    push({ type: 'success', message: 'Publicación eliminada' });
    logAction('delete_post', 'post', id);
  }

  async function toggleSuspend(user: Profile) {
    if (!canSuspendUser(profile!.role, user)) {
      return push({ type: 'error', message: 'No tienes permiso para suspender a este usuario' });
    }
    const next = !user.is_suspended;
    const { error } = await supabase.from('profiles').update({ is_suspended: next }).eq('id', user.id);
    if (error) return push({ type: 'error', message: error.message });
    setUsers((u) => u.map((x) => (x.id === user.id ? { ...x, is_suspended: next } : x)));
    push({ type: 'success', message: next ? 'Usuario suspendido' : 'Usuario reactivado' });
    logAction(next ? 'suspend_user' : 'reactivate_user', 'profile', user.id, user.username);
  }

  async function changeRole(user: Profile, newRole: string) {
    if (!isSupremeAdmin(profile!.role)) {
      return push({ type: 'error', message: 'Solo el admin supremo puede cambiar roles' });
    }
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
    if (error) return push({ type: 'error', message: error.message });
    setUsers((u) => u.map((x) => (x.id === user.id ? { ...x, role: newRole as Profile['role'] } : x)));
    push({ type: 'success', message: `Rol cambiado a ${newRole}` });
    logAction('change_role', 'profile', user.id, `${user.username}: ${user.role} -> ${newRole}`);
  }

  async function deleteGuild(g: Guild) {
    const { error } = await supabase.from('guilds').delete().eq('id', g.id);
    if (error) return push({ type: 'error', message: error.message });
    setGuilds((x) => x.filter((y) => y.id !== g.id));
    push({ type: 'success', message: 'Gremio eliminado' });
    logAction('delete_guild', 'guild', g.id, g.name);
  }

  async function deleteAlliance(a: Alliance) {
    const { error } = await supabase.from('alliances').delete().eq('id', a.id);
    if (error) return push({ type: 'error', message: error.message });
    setAlliances((x) => x.filter((y) => y.id !== a.id));
    push({ type: 'success', message: 'Alianza eliminada' });
    logAction('delete_alliance', 'alliance', a.id, a.name);
  }

  async function sendAnnouncement() {
    if (!announcement.trim()) return push({ type: 'error', message: 'Escribe un anuncio' });
    const { error } = await supabase.from('app_config').update({ announcement, announcement_active: true }).eq('id', 1);
    if (error) return push({ type: 'error', message: error.message });
    push({ type: 'success', message: 'Anuncio publicado' });
    logAction('send_announcement', 'app_config', undefined, announcement);
  }

  async function toggleMaintenance() {
    if (!config) return;
    const next = !config.maintenance_mode;
    const { error } = await supabase.from('app_config').update({ maintenance_mode: next, maintenance_message: maintenanceMsg }).eq('id', 1);
    if (error) return push({ type: 'error', message: error.message });
    setConfig({ ...config, maintenance_mode: next, maintenance_message: maintenanceMsg });
    push({ type: 'success', message: next ? 'Modo mantenimiento activado' : 'Modo mantenimiento desactivado' });
    logAction(next ? 'enable_maintenance' : 'disable_maintenance', 'app_config');
  }

  if (!profile || !isStaff(profile.role)) {
    return <EmptyState icon={Shield} title="Acceso restringido" hint="Solo moderadores y administradores." action={{ to: '/', label: 'Inicio' }} />;
  }

  const TABS: [typeof tab, string, typeof Shield, boolean][] = [
    ['resumen', 'Resumen', BarChart3, true],
    ['publicaciones', 'Publicaciones', Newspaper, true],
    ['usuarios', 'Usuarios', Users, true],
    ['gremios', 'Gremios', Shield, isAdmin(profile.role)],
    ['alianzas', 'Alianzas', Shield, isAdmin(profile.role)],
    ['reportes', 'Reportes', Flag, true],
    ['auditoria', 'Auditoría', FileText, isAdmin(profile.role)],
    ['anuncios', 'Anuncios', Megaphone, isAdmin(profile.role)],
    ['mantenimiento', 'Mantenimiento', Wrench, isAdmin(profile.role)],
  ];

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-gold-100 p-3 dark:bg-gold-950">
          <Shield className="h-6 w-6 text-gold-600 dark:text-gold-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Panel de administración</h1>
          <div className="mt-0.5 flex items-center gap-2">
            <RoleBadge role={profile.role} />
            <span className="text-sm text-ink-500">Gestión de la plataforma</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="card h-fit p-2">
          {TABS.filter(([, , , visible]) => visible).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${tab === key ? 'bg-gold-100 text-gold-700 dark:bg-gold-950 dark:text-gold-300' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'resumen' && stats && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Users} label="Usuarios" value={stats.users} />
                <StatCard icon={Shield} label="Gremios" value={stats.guilds} />
                <StatCard icon={Newspaper} label="Publicaciones" value={stats.posts} />
                <StatCard icon={Flag} label="Reportes" value={stats.reports} />
              </div>
              <Link to="/moderacion" className="card flex items-center justify-between p-4 card-hover">
                <div className="flex items-center gap-3">
                  <Gavel className="h-5 w-5 text-sky-500" />
                  <div>
                    <p className="font-medium">Cola de moderación</p>
                    <p className="text-xs text-ink-500">Gestionar reportes de la comunidad</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-ink-400" />
              </Link>
            </div>
          )}

          {tab === 'publicaciones' && (
            <div className="card divide-y divide-ink-100 dark:divide-ink-800">
              {posts.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin publicaciones.</p> : posts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-500">{p.author?.display_name || p.author?.username}</span>
                      {p.author?.medieval_rank && <RankBadge rank={p.author.medieval_rank} size="xs" />}
                    </div>
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
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{u.display_name || u.username}</p>
                      <RankBadge rank={u.medieval_rank} size="xs" />
                      <RoleBadge role={u.role} size="xs" />
                      {u.is_suspended && <span className="chip bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">Suspendido</span>}
                    </div>
                    <p className="text-xs text-ink-500">@{u.username} · {u.reputation_points} pts</p>
                  </div>
                  {isSupremeAdmin(profile.role) && u.role !== 'supreme_admin' && (
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className="input max-w-[140px] py-1.5 text-xs"
                    >
                      <option value="user">Usuario</option>
                      <option value="moderator">Moderador</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                  {canSuspendUser(profile.role, u) && (
                    <button onClick={() => toggleSuspend(u)} className={`btn-ghost ${u.is_suspended ? 'text-emerald-600' : 'text-red-600'}`}>
                      {u.is_suspended ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'gremios' && isAdmin(profile.role) && (
            <div className="card divide-y divide-ink-100 dark:divide-ink-800">
              {guilds.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin gremios.</p> : guilds.map((g) => (
                <div key={g.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{g.name}</p><p className="text-xs text-ink-500">{g.member_count} miembros</p></div>
                  <button onClick={() => deleteGuild(g)} className="btn-ghost text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}

          {tab === 'alianzas' && isAdmin(profile.role) && (
            <div className="card divide-y divide-ink-100 dark:divide-ink-800">
              {alliances.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin alianzas.</p> : alliances.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{a.name}</p></div>
                  <button onClick={() => deleteAlliance(a)} className="btn-ghost text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}

          {tab === 'reportes' && (
            <Link to="/moderacion" className="card flex items-center justify-between p-4 card-hover">
              <div className="flex items-center gap-3">
                <Flag className="h-5 w-5 text-sky-500" />
                <div>
                  <p className="font-medium">Ir a cola de moderación</p>
                  <p className="text-xs text-ink-500">Gestionar reportes abiertos y resueltos</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-ink-400" />
            </Link>
          )}

          {tab === 'auditoria' && isAdmin(profile.role) && (
            <div className="card divide-y divide-ink-100 dark:divide-ink-800">
              {auditLogs.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin registros.</p> : auditLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-ink-500">
                      {log.admin?.display_name || log.admin?.username} · {log.target_type} · {new Date(log.created_at).toLocaleString('es-ES')}
                    </p>
                    {log.details && <p className="text-xs text-ink-400">{log.details}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'anuncios' && isAdmin(profile.role) && (
            <div className="card space-y-4 p-5">
              <div><label className="label">Anuncio global</label><textarea rows={3} className="input" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="Escribe un anuncio para toda la comunidad..." /></div>
              <button onClick={sendAnnouncement} className="btn-primary"><Megaphone className="h-4 w-4" /> Publicar anuncio</button>
            </div>
          )}

          {tab === 'mantenimiento' && isAdmin(profile.role) && config && (
            <div className="card space-y-4 p-5">
              <div className="flex items-center justify-between rounded-xl bg-ink-100 p-4 dark:bg-ink-800">
                <div><p className="font-medium">Modo mantenimiento</p><p className="text-xs text-ink-500">{config.maintenance_mode ? 'Activo' : 'Inactivo'}</p></div>
                <button onClick={toggleMaintenance} className={config.maintenance_mode ? 'btn-outline text-red-600' : 'btn-primary'}>{config.maintenance_mode ? 'Desactivar' : 'Activar'}</button>
              </div>
              <div><label className="label">Mensaje de mantenimiento</label><textarea rows={2} className="input" value={maintenanceMsg} onChange={(e) => setMaintenanceMsg(e.target.value)} placeholder="Estamos mejorando Imperio..." /></div>
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
