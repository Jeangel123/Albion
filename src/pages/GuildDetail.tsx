import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Users, MapPin, Globe, Clock, ListChecks, MessageCircle, BadgeCheck, Images, Video as VideoIcon, ArrowLeft, Settings, ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { useRealtime, upsertById, removeById } from '../lib/useRealtime';
import { Banner } from '../components/Banner';
import { Avatar } from '../components/Avatar';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { Spinner, EmptyState } from '../components/ui';
import { Modal } from '../components/Modal';
import { slugify } from '../lib/format';
import { ImageUpload } from '../components/ImageUpload';
import { ACTIVITIES, type Guild, type Post, type Profile, type GuildMember } from '../lib/types';

type PostWithAuthor = Post & { author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> };

export default function GuildDetailPage() {
  const { slug } = useParams();
  const { profile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<(GuildMember & { user: Profile })[]>([]);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [gallery, setGallery] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);
  const [videos, setVideos] = useState<{ id: string; video_url: string; title: string | null }[]>([]);
  const [tab, setTab] = useState<'publicaciones' | 'galeria' | 'videos' | 'miembros'>('publicaciones');
  const [editOpen, setEditOpen] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isLeader, setIsLeader] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: g } = await supabase.from('guilds').select('*').eq('slug', slug).maybeSingle();
      if (!g) { setLoading(false); return; }
      setGuild(g as Guild);
      const [m, p, gal, vid] = await Promise.all([
        supabase.from('guild_members').select('*, user:profiles(*)').eq('guild_id', g.id),
        supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url)').eq('guild_id', g.id).order('created_at', { ascending: false }),
        supabase.from('guild_gallery').select('*').eq('guild_id', g.id).order('created_at', { ascending: false }),
        supabase.from('guild_videos').select('*').eq('guild_id', g.id).order('created_at', { ascending: false }),
      ]);
      setMembers((m.data ?? []) as any);
      setPosts((p.data ?? []) as PostWithAuthor[]);
      setGallery(gal.data ?? []);
      setVideos(vid.data ?? []);
      if (profile) {
        setIsMember((m.data ?? []).some((x: any) => x.user_id === profile.id));
        setIsLeader(g.owner_id === profile.id || (m.data ?? []).some((x: any) => x.user_id === profile.id && x.role === 'leader'));
      }
      setLoading(false);
    })();
  }, [slug, profile]);

  // Live-sync this guild when it changes (name, banner, description, etc.)
  useRealtime<Guild>({
    table: 'guilds',
    filter: `id=eq.${guild?.id ?? ''}`,
    onEvent: ({ eventType, new: row }) => {
      if (eventType === 'DELETE' || !row) setGuild(null);
      else if (row) setGuild((prev) => (prev && prev.id === row.id ? { ...prev, ...row } : (row as Guild)));
    },
  });

  // Live-sync posts for this guild (INSERT/UPDATE/DELETE)
  const handlePostEvent = useCallback(({ eventType, new: row, old: oldRow }: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => {
    if (eventType === 'DELETE' && oldRow?.id) {
      setPosts((list) => removeById(list, oldRow.id));
    } else if (row?.id) {
      supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url)').eq('id', row.id).maybeSingle()
        .then(({ data }) => { if (data) setPosts((list) => upsertById(list, data as PostWithAuthor)); });
    }
  }, []);
  useRealtime<Post>({ table: 'posts', filter: `guild_id=eq.${guild?.id ?? ''}`, onEvent: handlePostEvent });

  async function join() {
    if (!profile) return navigate('/login');
    if (!guild) return;
    await supabase.from('guild_members').insert({ guild_id: guild.id, user_id: profile.id, role: 'member' });
    await supabase.from('guilds').update({ member_count: guild.member_count + 1 }).eq('id', guild.id);
    await supabase.from('profiles').update({ guild_id: guild.id }).eq('id', profile.id);
    setIsMember(true);
    push({ type: 'success', message: 'Te uniste al gremio' });
  }

  async function leave() {
    if (!profile || !guild) return;
    await supabase.from('guild_members').delete().eq('guild_id', guild.id).eq('user_id', profile.id);
    await supabase.from('guilds').update({ member_count: Math.max(0, guild.member_count - 1) }).eq('id', guild.id);
    if (profile.guild_id === guild.id) await supabase.from('profiles').update({ guild_id: null }).eq('id', profile.id);
    setIsMember(false);
    push({ type: 'success', message: 'Saliste del gremio' });
  }

  if (loading) return <Spinner className="py-20" />;
  if (!guild) return <EmptyState icon={Users} title="Gremio no encontrado" action={{ to: '/gremios', label: 'Ver gremios' }} />;

  return (
    <div>
      <Banner src={guild.banner_url} className="h-48 sm:h-64" />
      <div className="container-app -mt-16">
        <Link to="/gremios" className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-gold-600"><ArrowLeft className="h-4 w-4" /> Gremios</Link>
        <div className="card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-ink-200 shadow-lg dark:border-ink-900 dark:bg-ink-800">
              {guild.avatar_url ? <img src={guild.avatar_url} alt={guild.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-display text-4xl font-bold text-gold-500">{guild.name[0]}</div>}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{guild.name}</h1>
                {guild.is_verified && <BadgeCheck className="h-5 w-5 text-gold-500" />}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500 dark:text-ink-400">
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {guild.member_count} miembros</span>
                {guild.home_city && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {guild.home_city}</span>}
                {guild.language && <span className="inline-flex items-center gap-1"><Globe className="h-4 w-4" /> {guild.language}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isLeader && (
                <button onClick={() => setEditOpen(true)} className="btn-outline"><Settings className="h-4 w-4" /> Editar</button>
              )}
              {guild.discord_url && (
                <a href={guild.discord_url} target="_blank" rel="noreferrer" className="btn-outline"><MessageCircle className="h-4 w-4" /> Discord</a>
              )}
              {isMember ? (
                <button onClick={leave} className="btn-outline">Salir</button>
              ) : (
                (guild.apply_url || guild.discord_url) && (
                  <a href={guild.apply_url || guild.discord_url || '#'} target="_blank" rel="noreferrer" className="btn-primary px-6 text-base"><ExternalLink className="h-4 w-4" /> Unirme</a>
                )
              )}
            </div>
          </div>

          {guild.description && <p className="mt-4 text-sm text-ink-700 dark:text-ink-200">{guild.description}</p>}

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {guild.schedule && <Info icon={Clock} label="Horarios" value={guild.schedule} />}
            {guild.requirements && <Info icon={ListChecks} label="Requisitos" value={guild.requirements} />}
            {guild.activities?.length > 0 && (
              <div>
                <p className="label">Actividades</p>
                <div className="flex flex-wrap gap-1.5">
                  {guild.activities.map((a) => <span key={a} className="chip bg-gold-100 text-gold-700 dark:bg-gold-950 dark:text-gold-300">{a}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-1 border-b border-ink-200 dark:border-ink-800">
          {(['publicaciones', 'galeria', 'videos', 'miembros'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-gold-500 text-gold-600 dark:text-gold-400' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'publicaciones' && (
            <div className="space-y-4">
              {isMember && profile && <CreatePost guildId={guild.id} />}
              {posts.length === 0 ? <EmptyState icon={MessageCircle} title="Sin publicaciones" hint="Este gremio aún no ha publicado." /> : (
                posts.map((p) => <PostCard key={p.id} post={p} author={p.author} />)
              )}
            </div>
          )}
          {tab === 'galeria' && (
            gallery.length === 0 ? <EmptyState icon={Images} title="Galería vacía" /> : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {gallery.map((g) => (
                  <div key={g.id} className="overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800">
                    <img src={g.image_url} alt={g.caption ?? ''} className="aspect-video w-full object-cover" />
                    {g.caption && <p className="p-2 text-xs text-ink-500">{g.caption}</p>}
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'videos' && (
            videos.length === 0 ? <EmptyState icon={VideoIcon} title="Sin videos" /> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {videos.map((v) => (
                  <div key={v.id} className="card p-2">
                    <video src={v.video_url} controls className="w-full rounded-lg bg-black" />
                    {v.title && <p className="p-2 text-sm font-medium">{v.title}</p>}
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'miembros' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => (
                <Link key={m.id} to={`/perfil/${m.user.username}`} className="card flex items-center gap-3 p-3 card-hover">
                  <Avatar src={m.user.avatar_url} alt={m.user.username} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.user.display_name || m.user.username}</p>
                    <p className="text-xs text-ink-500 capitalize">{m.role}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLeader && editOpen && (
        <GuildEditModal guild={guild} onClose={() => setEditOpen(false)} onSaved={() => setEditOpen(false)} />
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-200">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
        <span>{value}</span>
      </div>
    </div>
  );
}

export function CreateGuildPage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', description: '', language: 'Español', home_city: '', schedule: '', requirements: '',
    discord_url: '', apply_url: '', avatar_url: '', banner_url: '',
  });
  const [activities, setActivities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!profile) { navigate('/login'); return null; }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return push({ type: 'error', message: 'El nombre es obligatorio' });
    setLoading(true);
    const slug = slugify(form.name) + '-' + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.from('guilds').insert({
      ...form,
      slug,
      activities,
      owner_id: profile!.id,
    }).select('id, slug').single();
    setLoading(false);
    if (error) return push({ type: 'error', message: error.message });
    await supabase.from('guild_members').insert({ guild_id: data!.id, user_id: profile!.id, role: 'leader' });
    push({ type: 'success', message: 'Gremio creado' });
    navigate(`/gremio/${data!.slug}`);
  }

  return (
    <div className="container-app max-w-2xl py-6">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-900 dark:text-white">Crear gremio</h1>
      <form onSubmit={submit} className="card space-y-4 p-5">
        <div>
          <label className="label">Nombre *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Idioma</label>
            <input className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          </div>
          <div>
            <label className="label">Ciudad principal</label>
            <input className="input" value={form.home_city} onChange={(e) => setForm({ ...form, home_city: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Horarios</label>
          <input className="input" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Ej: 20:00 - 00:00 GMT-3" />
        </div>
        <div>
          <label className="label">Requisitos</label>
          <textarea rows={2} className="input" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
        </div>
        <div>
          <label className="label">Actividades</label>
          <ActivityFilterInline selected={activities} onChange={setActivities} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">URL Discord</label>
            <input className="input" value={form.discord_url} onChange={(e) => setForm({ ...form, discord_url: e.target.value })} />
          </div>
          <div>
            <label className="label">URL de solicitud</label>
            <input className="input" value={form.apply_url} onChange={(e) => setForm({ ...form, apply_url: e.target.value })} />
          </div>
        </div>
        <ImageUpload
          label="Avatar"
          variant="avatar"
          folder="guilds"
          ownerId={profile.id}
          value={form.avatar_url || null}
          onChange={(url) => setForm({ ...form, avatar_url: url ?? '' })}
        />
        <ImageUpload
          label="Banner"
          variant="banner"
          folder="guilds"
          ownerId={profile.id}
          value={form.banner_url || null}
          onChange={(url) => setForm({ ...form, banner_url: url ?? '' })}
        />
        <button disabled={loading} className="btn-primary w-full">{loading ? 'Creando...' : 'Crear gremio'}</button>
      </form>
    </div>
  );
}

function ActivityFilterInline({ selected, onChange }: { selected: string[]; onChange: (a: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ACTIVITIES.map((a) => (
        <button type="button" key={a} onClick={() => onChange(selected.includes(a) ? selected.filter((x) => x !== a) : [...selected, a])}
          className={`chip transition ${selected.includes(a) ? 'bg-gold-500 text-ink-950' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
          {a}
        </button>
      ))}
    </div>
  );
}

function GuildEditModal({ guild, onClose, onSaved }: { guild: Guild; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [form, setForm] = useState({
    name: guild.name, description: guild.description ?? '', language: guild.language ?? 'Español', home_city: guild.home_city ?? '',
    schedule: guild.schedule ?? '', requirements: guild.requirements ?? '', discord_url: guild.discord_url ?? '',
    apply_url: guild.apply_url ?? '', avatar_url: guild.avatar_url ?? '', banner_url: guild.banner_url ?? '',
  });
  const [activities, setActivities] = useState<string[]>(guild.activities ?? []);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('guilds').update({ ...form, activities, updated_at: new Date().toISOString() }).eq('id', guild.id);
    setSaving(false);
    if (error) return push({ type: 'error', message: error.message });
    push({ type: 'success', message: 'Gremio actualizado' });
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="Editar gremio" size="lg">
      <form onSubmit={save} className="space-y-4">
        <div><label className="label">Nombre</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Descripción</label><textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Idioma</label><input className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></div>
          <div><label className="label">Ciudad</label><input className="input" value={form.home_city} onChange={(e) => setForm({ ...form, home_city: e.target.value })} /></div>
        </div>
        <div><label className="label">Horarios</label><input className="input" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} /></div>
        <div><label className="label">Requisitos</label><textarea rows={2} className="input" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} /></div>
        <div>
          <label className="label">Actividades</label>
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITIES.map((a) => (
              <button type="button" key={a} onClick={() => setActivities(activities.includes(a) ? activities.filter((x) => x !== a) : [...activities, a])}
                className={`chip ${activities.includes(a) ? 'bg-gold-500 text-ink-950' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>{a}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Discord</label><input className="input" value={form.discord_url} onChange={(e) => setForm({ ...form, discord_url: e.target.value })} /></div>
          <div><label className="label">Solicitud</label><input className="input" value={form.apply_url} onChange={(e) => setForm({ ...form, apply_url: e.target.value })} /></div>
        </div>
        <ImageUpload
          label="Avatar"
          variant="avatar"
          folder="guilds"
          ownerId={guild.id}
          value={form.avatar_url || null}
          onChange={(url) => setForm({ ...form, avatar_url: url ?? '' })}
        />
        <ImageUpload
          label="Banner"
          variant="banner"
          folder="guilds"
          ownerId={guild.id}
          value={form.banner_url || null}
          onChange={(url) => setForm({ ...form, banner_url: url ?? '' })}
        />
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-ghost">Cancelar</button><button disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button></div>
      </form>
    </Modal>
  );
}
