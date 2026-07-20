import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Users, Flag, Newspaper, BarChart3, Megaphone, Wrench, Check, X, Trash2, Ban,
  Crown, Gavel, FileText, ArrowRight, Lightbulb, Coins, Settings, Search, Pin, Plus, Edit3, Trophy,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Spinner, EmptyState } from '../components/ui';
import { SeasonsPanel } from '../components/SeasonsPanel';
import { RankBadge, RoleBadge } from '../components/RankBadge';
import {
  isAdmin, isSupremeAdmin, isStaff, isFounder, canSuspendUser, canManageEconomy,
  canManageConfig, canToggleMaintenance, canViewAuditLog, ROLE_OPTIONS,
} from '../lib/permissions';
import type { Profile, Post, Guild, Alliance, AppConfig, Suggestion, SuggestionStatus, GlobalAnnouncement } from '../lib/types';
import { SUGGESTION_STATUSES, SUGGESTION_CATEGORIES } from '../lib/types';

type TabKey = 'resumen' | 'estadisticas' | 'publicaciones' | 'usuarios' | 'gremios' | 'alianzas' | 'reportes' | 'consejo' | 'auditoria' | 'anuncios' | 'mantenimiento' | 'config' | 'economia' | 'temporadas';

export default function AdminPage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState<TabKey>('resumen');
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [posts, setPosts] = useState<(Post & { author: Pick<Profile, 'username' | 'display_name' | 'medieval_rank' | 'role'> })[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [maintenanceReturn, setMaintenanceReturn] = useState('');
  const [councilItems, setCouncilItems] = useState<(Suggestion & { author: Pick<Profile, 'username' | 'display_name'> })[]>([]);
  const [announcements, setAnnouncements] = useState<GlobalAnnouncement[]>([]);
  const [frames, setFrames] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [editingFrame, setEditingFrame] = useState<any | null>(null);

  const logAction = useCallback(async (action: string, target_type?: string, target_id?: string, details?: string) => {
    if (!profile) return;
    await supabase.from('audit_log').insert({ admin_id: profile.id, action, target_type, target_id, details });
  }, [profile]);

  const loadAll = useCallback(async () => {
    if (!profile || !isStaff(profile.role)) return;

    const counts = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('guilds').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('comments').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('communities').select('id', { count: 'exact', head: true }),
      supabase.from('suggestions').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      users: counts[0].count ?? 0,
      guilds: counts[1].count ?? 0,
      posts: counts[2].count ?? 0,
      reports: counts[3].count ?? 0,
      comments: counts[4].count ?? 0,
      messages: counts[5].count ?? 0,
      communities: counts[6].count ?? 0,
      suggestions: counts[7].count ?? 0,
    });

    const [postData, userData, guildData, allianceData, configData, annData, frameData, shopData] = await Promise.all([
      supabase.from('posts').select('*, author:profiles(username, display_name, medieval_rank, role)').order('created_at', { ascending: false }).limit(30),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('guilds').select('*').order('created_at', { ascending: false }),
      supabase.from('alliances').select('*').order('created_at', { ascending: false }),
      supabase.from('app_config').select('*').eq('id', 1).maybeSingle(),
      supabase.from('global_announcements').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('avatar_frames').select('*').order('created_at', { ascending: false }),
      supabase.from('shop_items').select('*').order('created_at', { ascending: false }),
    ]);
    setPosts((postData.data ?? []) as any);
    setUsers(userData.data ?? []);
    setGuilds(guildData.data ?? []);
    setAlliances(allianceData.data ?? []);
    setConfig(configData.data as AppConfig | null);
    setAnnouncements(annData.data ?? []);
    setFrames(frameData.data ?? []);
    setShopItems(shopData.data ?? []);
    if (configData.data) {
      const cfg = configData.data as AppConfig;
      setAnnouncement(cfg.announcement ?? '');
      setMaintenanceMsg(cfg.maintenance_message ?? '');
      setMaintenanceReturn(cfg.maintenance_return_date ?? '');
    }

    if (isAdmin(profile.role)) {
      const { data: logs } = await supabase
        .from('audit_log')
        .select('*, admin:profiles!admin_id(username, display_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      setAuditLogs(logs ?? []);
    }

    const { data: sugs } = await supabase
      .from('suggestions')
      .select('*, author:profiles(username, display_name)')
      .order('vote_count', { ascending: false })
      .limit(50);
    if (sugs) setCouncilItems(sugs as any);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // === Actions ===

  async function deletePost(id: string) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) return push({ type: 'error', message: error.message });
    setPosts((p) => p.filter((x) => x.id !== id));
    push({ type: 'success', message: 'Publicación eliminada' });
    logAction('delete_post', 'post', id);
  }

  async function toggleSuspend(user: Profile) {
    if (!canSuspendUser(profile!.role, user)) return push({ type: 'error', message: 'No tienes permiso' });
    const next = !user.is_suspended;
    const { error } = await supabase.from('profiles').update({ is_suspended: next }).eq('id', user.id);
    if (error) return push({ type: 'error', message: error.message });
    setUsers((u) => u.map((x) => (x.id === user.id ? { ...x, is_suspended: next } : x)));
    push({ type: 'success', message: next ? 'Usuario suspendido' : 'Usuario reactivado' });
    logAction(next ? 'suspend_user' : 'reactivate_user', 'profile', user.id, user.username);
  }

  async function changeRole(user: Profile, newRole: string) {
    if (!isSupremeAdmin(profile!.role)) return push({ type: 'error', message: 'Solo supremo/fundador puede cambiar roles' });
    if (newRole === 'founder' && !isFounder(profile!.role)) return push({ type: 'error', message: 'Solo el fundador puede asignar ese rol' });
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
    if (error) return push({ type: 'error', message: error.message });
    setUsers((u) => u.map((x) => (x.id === user.id ? { ...x, role: newRole as Profile['role'] } : x)));
    push({ type: 'success', message: `Rol cambiado a ${newRole}` });
    logAction('change_role', 'profile', user.id, `${user.username}: ${user.role} -> ${newRole}`);
  }

  async function banUser(user: Profile) {
    if (!canSuspendUser(profile!.role, user)) return push({ type: 'error', message: 'No tienes permiso' });
    const { error } = await supabase.from('profiles').update({ is_suspended: true, role: 'user' }).eq('id', user.id);
    if (error) return push({ type: 'error', message: error.message });
    setUsers((u) => u.map((x) => (x.id === user.id ? { ...x, is_suspended: true, role: 'user' } : x)));
    push({ type: 'success', message: 'Usuario baneado' });
    logAction('ban_user', 'profile', user.id, user.username);
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

  // === Announcements ===

  async function createAnnouncement() {
    const { error } = await supabase.from('global_announcements').insert({
      title: 'Anuncio',
      content: announcement.trim(),
      is_active: true,
      created_by: profile!.id,
    });
    if (error) return push({ type: 'error', message: error.message });
    push({ type: 'success', message: 'Anuncio creado' });
    setAnnouncement('');
    logAction('create_announcement', 'announcement');
    loadAll();
  }

  async function togglePinAnn(a: GlobalAnnouncement) {
    const { error } = await supabase.from('global_announcements').update({ is_pinned: !a.is_pinned }).eq('id', a.id);
    if (error) return push({ type: 'error', message: error.message });
    logAction('toggle_pin_announcement', 'announcement', a.id);
    loadAll();
  }

  async function toggleActiveAnn(a: GlobalAnnouncement) {
    const { error } = await supabase.from('global_announcements').update({ is_active: !a.is_active }).eq('id', a.id);
    if (error) return push({ type: 'error', message: error.message });
    logAction('toggle_announcement', 'announcement', a.id);
    loadAll();
  }

  async function deleteAnn(a: GlobalAnnouncement) {
    const { error } = await supabase.from('global_announcements').delete().eq('id', a.id);
    if (error) return push({ type: 'error', message: error.message });
    logAction('delete_announcement', 'announcement', a.id);
    loadAll();
  }

  // === Maintenance ===

  async function toggleMaintenance() {
    if (!canToggleMaintenance(profile!.role)) return push({ type: 'error', message: 'No tienes permiso' });
    if (!config) return;
    const next = !config.maintenance_mode;
    const { error } = await supabase.from('app_config').update({
      maintenance_mode: next,
      maintenance_message: maintenanceMsg,
      maintenance_return_date: maintenanceReturn || null,
    }).eq('id', 1);
    if (error) return push({ type: 'error', message: error.message });
    setConfig({ ...config, maintenance_mode: next, maintenance_message: maintenanceMsg, maintenance_return_date: maintenanceReturn || null });
    push({ type: 'success', message: next ? 'Mantenimiento activado' : 'Mantenimiento desactivado' });
    logAction(next ? 'enable_maintenance' : 'disable_maintenance', 'app_config');
  }

  // === Config ===

  async function saveConfig(fields: Record<string, any>) {
    if (!canManageConfig(profile!.role)) return push({ type: 'error', message: 'Solo el fundador' });
    const { error } = await supabase.from('app_config').update(fields).eq('id', 1);
    if (error) return push({ type: 'error', message: error.message });
    push({ type: 'success', message: 'Configuración guardada' });
    logAction('update_config', 'app_config', undefined, JSON.stringify(fields));
    loadAll();
  }

  // === Economy ===

  async function saveFrame(frame: any) {
    if (!canManageEconomy(profile!.role)) return push({ type: 'error', message: 'No tienes permiso' });
    if (frame.id) {
      const { error } = await supabase.from('avatar_frames').update({
        name: frame.name, description: frame.description, rarity: frame.rarity,
        price: frame.price, is_free: frame.is_free, icon: frame.icon,
      }).eq('id', frame.id);
      if (error) return push({ type: 'error', message: error.message });
      push({ type: 'success', message: 'Marco actualizado' });
      logAction('update_frame', 'avatar_frames', frame.id, frame.name);
    } else {
      const { error } = await supabase.from('avatar_frames').insert({
        name: frame.name, description: frame.description, rarity: frame.rarity,
        price: frame.price, is_free: frame.is_free, icon: frame.icon,
        slug: frame.name.toLowerCase().replace(/\s+/g, '-'),
      });
      if (error) return push({ type: 'error', message: error.message });
      push({ type: 'success', message: 'Marco creado' });
      logAction('create_frame', 'avatar_frames', undefined, frame.name);
    }
    setEditingFrame(null);
    loadAll();
  }

  async function deleteFrame(id: string) {
    const { error } = await supabase.from('avatar_frames').delete().eq('id', id);
    if (error) return push({ type: 'error', message: error.message });
    push({ type: 'success', message: 'Marco eliminado' });
    logAction('delete_frame', 'avatar_frames', id);
    loadAll();
  }

  async function adjustUserCurrency(user: Profile, type: 'coins' | 'reputation', delta: number) {
    if (!canManageEconomy(profile!.role)) return push({ type: 'error', message: 'No tienes permiso' });
    if (type === 'coins') {
      const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle();
      const balance = (wallet as any)?.balance ?? 0;
      const newBalance = Math.max(0, balance + delta);
      if (wallet) {
        await supabase.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      } else {
        await supabase.from('wallets').insert({ user_id: user.id, balance: newBalance });
      }
      await supabase.from('transactions').insert({
        user_id: user.id, amount: delta, type: delta > 0 ? 'earn' : 'spend',
        reference: 'admin_adjust', description: `Ajuste admin ${delta > 0 ? '+' : ''}${delta}`,
      });
    } else {
      const newRep = Math.max(0, user.reputation_points + delta);
      await supabase.from('profiles').update({ reputation_points: newRep }).eq('id', user.id);
      await supabase.from('reputation_log').insert({
        user_id: user.id, action: 'admin_adjust', points: delta,
        reference_type: 'admin', reference_id: profile!.id,
      });
    }
    push({ type: 'success', message: `${type === 'coins' ? 'Monedas' : 'Reputación'} ajustadas (${delta > 0 ? '+' : ''}${delta})` });
    logAction('adjust_currency', 'profile', user.id, `${user.username}: ${type} ${delta}`);
    loadAll();
  }

  // === Council ===

  async function changeSuggestionStatus(suggestion: Suggestion & { author: Pick<Profile, 'username' | 'display_name'> }, newStatus: SuggestionStatus) {
    if (suggestion.status === newStatus) return;
    const { error } = await supabase.from('suggestions').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', suggestion.id);
    if (error) return push({ type: 'error', message: error.message });
    setCouncilItems((prev) => prev.map((s) => (s.id === suggestion.id ? { ...s, status: newStatus } : s)));
    push({ type: 'success', message: 'Estado actualizado' });
    logAction('update_suggestion_status', 'suggestion', suggestion.id, `${suggestion.title}: ${newStatus}`);
    await supabase.from('notifications').insert({
      user_id: suggestion.author_id, actor_id: profile!.id, type: 'suggestion_status',
      content: `Tu sugerencia "${suggestion.title}" ahora está: ${SUGGESTION_STATUSES.find((s) => s.key === newStatus)?.label ?? newStatus}`,
      target_type: 'suggestion', target_id: suggestion.id,
    });
  }

  async function deleteSuggestion(suggestion: Suggestion & { author: Pick<Profile, 'username' | 'display_name'> }) {
    const { error } = await supabase.from('suggestions').delete().eq('id', suggestion.id);
    if (error) return push({ type: 'error', message: error.message });
    setCouncilItems((prev) => prev.filter((s) => s.id !== suggestion.id));
    push({ type: 'success', message: 'Sugerencia eliminada' });
    logAction('delete_suggestion', 'suggestion', suggestion.id, suggestion.title);
  }

  // === Render ===

  if (!profile || !isStaff(profile.role)) {
    return <EmptyState icon={Shield} title="Acceso restringido" hint="Solo moderadores y administradores." action={{ to: '/', label: 'Inicio' }} />;
  }

  const TABS: [TabKey, string, typeof Shield, boolean][] = [
    ['resumen', 'Resumen', BarChart3, true],
    ['estadisticas', 'Estadísticas', BarChart3, true],
    ['publicaciones', 'Publicaciones', Newspaper, true],
    ['usuarios', 'Usuarios', Users, true],
    ['gremios', 'Gremios', Shield, isAdmin(profile.role)],
    ['alianzas', 'Alianzas', Shield, isAdmin(profile.role)],
    ['reportes', 'Reportes', Flag, true],
    ['consejo', 'Consejo', Lightbulb, true],
    ['anuncios', 'Anuncios', Megaphone, true],
    ['economia', 'Economía', Coins, canManageEconomy(profile.role)],
    ['temporadas', 'Temporadas', Trophy, isAdmin(profile.role)],
    ['config', 'Configuración', Settings, canManageConfig(profile.role)],
    ['auditoria', 'Auditoría', FileText, canViewAuditLog(profile.role)],
    ['mantenimiento', 'Mantenimiento', Wrench, canToggleMaintenance(profile.role)],
  ];

  const filteredUsers = userSearch
    ? users.filter((u) => u.username.toLowerCase().includes(userSearch.toLowerCase()) || (u.display_name ?? '').toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-gold-100 p-3 dark:bg-gold-950">
          {isFounder(profile.role) ? <Crown className="h-6 w-6 text-gold-600 dark:text-gold-400" /> : <Shield className="h-6 w-6 text-gold-600 dark:text-gold-400" />}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
            {isFounder(profile.role) ? 'Panel del Fundador' : 'Panel de administración'}
          </h1>
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
          {/* === RESUMEN === */}
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
                  <div><p className="font-medium">Cola de moderación</p><p className="text-xs text-ink-500">Gestionar reportes de la comunidad</p></div>
                </div>
                <ArrowRight className="h-5 w-5 text-ink-400" />
              </Link>
            </div>
          )}

          {/* === ESTADÍSTICAS === */}
          {tab === 'estadisticas' && stats && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard icon={Users} label="Usuarios registrados" value={stats.users} />
                <StatCard icon={Shield} label="Gremios" value={stats.guilds} />
                <StatCard icon={Users} label="Comunidades" value={stats.communities} />
                <StatCard icon={Newspaper} label="Publicaciones" value={stats.posts} />
                <StatCard icon={FileText} label="Comentarios" value={stats.comments} />
                <StatCard icon={Megaphone} label="Mensajes enviados" value={stats.messages} />
                <StatCard icon={Flag} label="Reportes abiertos" value={stats.reports} />
                <StatCard icon={Lightbulb} label="Sugerencias" value={stats.suggestions} />
              </div>
              <div className="card p-5">
                <h3 className="mb-3 font-display font-semibold">Distribución de actividad</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Publicaciones', value: stats.posts, color: 'bg-gold-500' },
                    { label: 'Comentarios', value: stats.comments, color: 'bg-sky-500' },
                    { label: 'Mensajes', value: stats.messages, color: 'bg-emerald-500' },
                    { label: 'Sugerencias', value: stats.suggestions, color: 'bg-amber-500' },
                  ].map((row) => {
                    const max = Math.max(stats.posts, stats.comments, stats.messages, stats.suggestions, 1);
                    return (
                      <div key={row.label} className="flex items-center gap-3">
                        <span className="w-28 text-sm text-ink-500">{row.label}</span>
                        <div className="h-6 flex-1 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                          <div className={`h-full ${row.color} transition-all`} style={{ width: `${(row.value / max) * 100}%` }} />
                        </div>
                        <span className="w-12 text-right text-sm font-medium">{row.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* === PUBLICACIONES === */}
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

          {/* === USUARIOS === */}
          {tab === 'usuarios' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar usuarios..."
                  className="input pl-10"
                />
              </div>
              <div className="card divide-y divide-ink-100 dark:divide-ink-800">
                {filteredUsers.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin usuarios.</p> : filteredUsers.map((u) => (
                  <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{u.display_name || u.username}</p>
                        <RankBadge rank={u.medieval_rank} size="xs" />
                        <RoleBadge role={u.role} size="xs" />
                        {u.is_suspended && <span className="chip bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">Suspendido</span>}
                      </div>
                      <p className="text-xs text-ink-500">@{u.username} · {u.reputation_points} pts</p>
                    </div>
                    {isSupremeAdmin(profile.role) && u.role !== 'founder' && (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        className="input max-w-[140px] py-1.5 text-xs"
                      >
                        {ROLE_OPTIONS.filter((r) => r.key !== 'founder' || isFounder(profile.role)).map((r) => (
                          <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                      </select>
                    )}
                    {canManageEconomy(profile.role) && (
                      <div className="flex gap-1">
                        <button onClick={() => adjustUserCurrency(u, 'coins', 100)} className="btn-ghost text-xs text-gold-600" title="+100 monedas">+100🪙</button>
                        <button onClick={() => adjustUserCurrency(u, 'coins', -100)} className="btn-ghost text-xs text-red-600" title="-100 monedas">-100🪙</button>
                        <button onClick={() => adjustUserCurrency(u, 'reputation', 50)} className="btn-ghost text-xs text-emerald-600" title="+50 rep">+50⚡</button>
                      </div>
                    )}
                    {canSuspendUser(profile.role, u) && (
                      <div className="flex gap-1">
                        <button onClick={() => toggleSuspend(u)} className={`btn-ghost ${u.is_suspended ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {u.is_suspended ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </button>
                        {!u.is_suspended && u.role !== 'founder' && (
                          <button onClick={() => banUser(u)} className="btn-ghost text-red-600" title="Banear">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === GREMIOS === */}
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

          {/* === ALIANZAS === */}
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

          {/* === REPORTES === */}
          {tab === 'reportes' && (
            <Link to="/moderacion" className="card flex items-center justify-between p-4 card-hover">
              <div className="flex items-center gap-3">
                <Flag className="h-5 w-5 text-sky-500" />
                <div><p className="font-medium">Ir a cola de moderación</p><p className="text-xs text-ink-500">Gestionar reportes abiertos y resueltos</p></div>
              </div>
              <ArrowRight className="h-5 w-5 text-ink-400" />
            </Link>
          )}

          {/* === CONSEJO === */}
          {tab === 'consejo' && (
            <div className="card divide-y divide-ink-100 dark:divide-ink-800">
              {councilItems.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin sugerencias.</p> : councilItems.map((s) => (
                <div key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300 text-[10px]">
                          {SUGGESTION_CATEGORIES.find((c) => c.key === s.category)?.emoji} {SUGGESTION_CATEGORIES.find((c) => c.key === s.category)?.label}
                        </span>
                        <span className={`chip ${SUGGESTION_STATUSES.find((st) => st.key === s.status)?.color} text-[10px]`}>
                          {SUGGESTION_STATUSES.find((st) => st.key === s.status)?.emoji} {SUGGESTION_STATUSES.find((st) => st.key === s.status)?.label}
                        </span>
                      </div>
                      <p className="mt-1.5 font-medium">{s.title}</p>
                      <p className="text-xs text-ink-500">{s.author?.display_name || s.author?.username} · {s.vote_count} votos</p>
                    </div>
                    <button onClick={() => deleteSuggestion(s)} className="btn-ghost text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SUGGESTION_STATUSES.map((st) => (
                      <button
                        key={st.key}
                        onClick={() => changeSuggestionStatus(s, st.key)}
                        className={`chip text-[10px] transition ${s.status === st.key ? st.color + ' ring-1 ring-current' : 'bg-ink-100 text-ink-500 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-400'}`}
                      >
                        {st.emoji} {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* === ANUNCIOS === */}
          {tab === 'anuncios' && (
            <div className="space-y-4">
              <div className="card space-y-3 p-5">
                <label className="label">Nuevo anuncio global</label>
                <textarea rows={3} className="input" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="Escribe un anuncio para toda la comunidad..." />
                <button onClick={createAnnouncement} disabled={!announcement.trim()} className="btn-primary">
                  <Megaphone className="h-4 w-4" /> Publicar
                </button>
              </div>
              <div className="card divide-y divide-ink-100 dark:divide-ink-800">
                {announcements.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin anuncios.</p> : announcements.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {a.is_pinned && <Pin className="h-3.5 w-3.5 text-gold-500" />}
                        <span className={`chip text-[10px] ${a.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>
                          {a.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{a.content}</p>
                      <p className="text-xs text-ink-500">{new Date(a.created_at).toLocaleString('es-ES')}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => togglePinAnn(a)} className="btn-ghost" title={a.is_pinned ? 'Desfijar' : 'Fijar'}>
                        <Pin className={`h-4 w-4 ${a.is_pinned ? 'text-gold-500' : ''}`} />
                      </button>
                      <button onClick={() => toggleActiveAnn(a)} className="btn-ghost" title={a.is_active ? 'Desactivar' : 'Activar'}>
                        {a.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteAnn(a)} className="btn-ghost text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === ECONOMÍA === */}
          {tab === 'economia' && canManageEconomy(profile.role) && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold">Marcos de avatar</h3>
                  <button onClick={() => setEditingFrame({ name: '', description: '', rarity: 'common', price: 0, is_free: false, icon: '' })} className="btn-primary text-xs">
                    <Plus className="h-3.5 w-3.5" /> Crear marco
                  </button>
                </div>
              </div>
              <div className="card divide-y divide-ink-100 dark:divide-ink-800">
                {frames.length === 0 ? <p className="p-4 text-sm text-ink-500">Sin marcos.</p> : frames.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{f.icon} {f.name}</p>
                      <p className="text-xs text-ink-500">{f.rarity} · {f.is_free ? 'Gratis' : `${f.price} monedas`}</p>
                    </div>
                    <button onClick={() => setEditingFrame(f)} className="btn-ghost"><Edit3 className="h-4 w-4" /></button>
                    <button onClick={() => deleteFrame(f.id)} className="btn-ghost text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              {editingFrame && (
                <FrameEditor frame={editingFrame} onSave={saveFrame} onCancel={() => setEditingFrame(null)} />
              )}
            </div>
          )}

          {/* === TEMPORADAS === */}
          {tab === 'temporadas' && isAdmin(profile.role) && profile && (
            <SeasonsPanel adminId={profile.id} />
          )}

          {/* === CONFIGURACIÓN === */}
          {tab === 'config' && canManageConfig(profile.role) && config && (
            <ConfigEditor config={config} onSave={saveConfig} />
          )}

          {/* === AUDITORÍA === */}
          {tab === 'auditoria' && canViewAuditLog(profile.role) && (
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

          {/* === MANTENIMIENTO === */}
          {tab === 'mantenimiento' && canToggleMaintenance(profile.role) && config && (
            <div className="card space-y-4 p-5">
              <div className="flex items-center justify-between rounded-xl bg-ink-100 p-4 dark:bg-ink-800">
                <div><p className="font-medium">Modo mantenimiento</p><p className="text-xs text-ink-500">{config.maintenance_mode ? 'Activo' : 'Inactivo'}</p></div>
                <button onClick={toggleMaintenance} className={config.maintenance_mode ? 'btn-outline text-red-600' : 'btn-primary'}>
                  {config.maintenance_mode ? 'Desactivar' : 'Activar'}
                </button>
              </div>
              <div>
                <label className="label">Mensaje de mantenimiento</label>
                <textarea rows={2} className="input" value={maintenanceMsg} onChange={(e) => setMaintenanceMsg(e.target.value)} placeholder="Estamos mejorando Imperio..." />
              </div>
              <div>
                <label className="label">Fecha estimada de regreso (opcional)</label>
                <input type="date" className="input" value={maintenanceReturn ? maintenanceReturn.slice(0, 10) : ''} onChange={(e) => setMaintenanceReturn(e.target.value)} />
              </div>
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

const RARITY_OPTIONS = ['common', 'rare', 'epic', 'legendary', 'mythic'];

function FrameEditor({ frame, onSave, onCancel }: { frame: any; onSave: (f: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState(frame);

  return (
    <div className="card space-y-3 p-5">
      <h3 className="font-display font-semibold">{frame.id ? 'Editar marco' : 'Nuevo marco'}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Nombre</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Icono (emoji)</label><input className="input" value={form.icon || ''} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="👑" /></div>
        <div>
          <label className="label">Rareza</label>
          <select className="input" value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })}>
            {RARITY_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div><label className="label">Precio</label><input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} /></div>
      </div>
      <div><label className="label">Descripción</label><textarea rows={2} className="input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
        Gratis
      </label>
      <div className="flex gap-2">
        <button onClick={() => onSave(form)} className="btn-primary"><Check className="h-4 w-4" /> Guardar</button>
        <button onClick={onCancel} className="btn-ghost">Cancelar</button>
      </div>
    </div>
  );
}

function ConfigEditor({ config, onSave }: { config: AppConfig; onSave: (f: Record<string, any>) => void }) {
  const [form, setForm] = useState({
    platform_name: config.platform_name ?? '',
    platform_description: config.platform_description ?? '',
    platform_logo: config.platform_logo ?? '',
    platform_banner: config.platform_banner ?? '',
    support_email: config.support_email ?? '',
    discord_url: config.discord_url ?? '',
    available_languages: config.available_languages ?? 'es,en,pt',
    currency_name: config.currency_name ?? '',
    rep_create_post: config.rep_create_post ?? 10,
    rep_create_community: config.rep_create_community ?? 25,
    rep_send_message: config.rep_send_message ?? 2,
    rep_receive_reaction: config.rep_receive_reaction ?? 5,
  });

  return (
    <div className="card space-y-4 p-5">
      <h3 className="font-display font-semibold">Configuración general</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Nombre de la plataforma</label><input className="input" value={form.platform_name} onChange={(e) => setForm({ ...form, platform_name: e.target.value })} /></div>
        <div><label className="label">Correo de soporte</label><input className="input" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} /></div>
        <div><label className="label">Discord</label><input className="input" value={form.discord_url} onChange={(e) => setForm({ ...form, discord_url: e.target.value })} placeholder="https://discord.gg/..." /></div>
        <div><label className="label">Idiomas disponibles</label><input className="input" value={form.available_languages} onChange={(e) => setForm({ ...form, available_languages: e.target.value })} placeholder="es,en,pt" /></div>
        <div><label className="label">Nombre de la moneda</label><input className="input" value={form.currency_name} onChange={(e) => setForm({ ...form, currency_name: e.target.value })} /></div>
        <div><label className="label">Logo (URL)</label><input className="input" value={form.platform_logo} onChange={(e) => setForm({ ...form, platform_logo: e.target.value })} /></div>
      </div>
      <div><label className="label">Descripción</label><textarea rows={2} className="input" value={form.platform_description} onChange={(e) => setForm({ ...form, platform_description: e.target.value })} /></div>
      <div><label className="label">Banner (URL)</label><input className="input" value={form.platform_banner} onChange={(e) => setForm({ ...form, platform_banner: e.target.value })} /></div>

      <div className="border-t border-ink-100 pt-4 dark:border-ink-800">
        <h4 className="mb-3 font-display text-sm font-semibold text-gold-600 dark:text-gold-400">Valores del sistema de puntos</h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="label">Crear publicación</label><input type="number" className="input" value={form.rep_create_post} onChange={(e) => setForm({ ...form, rep_create_post: parseInt(e.target.value) || 0 })} /></div>
          <div><label className="label">Crear comunidad</label><input type="number" className="input" value={form.rep_create_community} onChange={(e) => setForm({ ...form, rep_create_community: parseInt(e.target.value) || 0 })} /></div>
          <div><label className="label">Enviar mensaje</label><input type="number" className="input" value={form.rep_send_message} onChange={(e) => setForm({ ...form, rep_send_message: parseInt(e.target.value) || 0 })} /></div>
          <div><label className="label">Recibir reacción</label><input type="number" className="input" value={form.rep_receive_reaction} onChange={(e) => setForm({ ...form, rep_receive_reaction: parseInt(e.target.value) || 0 })} /></div>
        </div>
      </div>

      <button onClick={() => onSave(form)} className="btn-primary"><Check className="h-4 w-4" /> Guardar configuración</button>
    </div>
  );
}
