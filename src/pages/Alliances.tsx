import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, Shield, BadgeCheck, ArrowLeft, MessageCircle, Newspaper, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Banner } from '../components/Banner';
import { GuildCard } from '../components/GuildCard';
import { Spinner, EmptyState, SectionTitle } from '../components/ui';
import { Modal } from '../components/Modal';
import { ImageUpload } from '../components/ImageUpload';
import { slugify, formatDateTime } from '../lib/format';
import type { Alliance, Guild, Post, Profile, AlbionEvent } from '../lib/types';

type PostWithAuthor = Post & { author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank'> };

export function AlliancesPage() {
  const { profile } = useAuth();
  const [alliances, setAlliances] = useState<Alliance[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    const { data, error } = await supabase.from('alliances').select('*').order('created_at', { ascending: false });
    if (error) console.error('[alliances] load:', error.message);
    setAlliances(data ?? []);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="container-app py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Alianzas</h1>
          <p className="text-sm text-ink-500">Coaliciones de gremios</p>
        </div>
        {profile && <button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Crear alianza</button>}
      </div>
      {!alliances ? <Spinner /> : alliances.length === 0 ? (
        <EmptyState icon={Shield} title="No hay alianzas" hint="Crea la primera alianza." action={profile ? { to: '#', label: '' } : undefined} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alliances.map((a) => <AllianceCard key={a.id} alliance={a} />)}
        </div>
      )}
      {createOpen && <CreateAllianceModal onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} />}
    </div>
  );
}

function AllianceCard({ alliance }: { alliance: Alliance }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    supabase.from('alliance_members').select('id', { count: 'exact', head: true }).eq('alliance_id', alliance.id).then(({ count }) => setCount(count ?? 0));
  }, [alliance.id]);
  return (
    <Link to={`/alianza/${alliance.slug}`} className="card card-hover block overflow-hidden">
      <Banner src={alliance.banner_url} className="h-24" />
      <div className="px-4 pb-4 pt-10">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-display font-semibold">{alliance.name}</h3>
          <BadgeCheck className="h-4 w-4 text-gold-500" />
        </div>
        <p className="mt-1 text-xs text-ink-500">{count} gremios</p>
        {alliance.description && <p className="mt-2 line-clamp-2 text-sm text-ink-600 dark:text-ink-300">{alliance.description}</p>}
      </div>
    </Link>
  );
}

export function AllianceDetailPage() {
  const { slug } = useParams();
  const { profile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [alliance, setAlliance] = useState<Alliance | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [events, setEvents] = useState<AlbionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'gremios' | 'noticias' | 'eventos'>('gremios');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: a } = await supabase.from('alliances').select('*').eq('slug', slug).maybeSingle();
      if (!a) { setLoading(false); return; }
      setAlliance(a as Alliance);
      const [g, p, e] = await Promise.all([
        supabase.from('alliance_members').select('guild:guilds(*)').eq('alliance_id', a.id),
        supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank)').in('guild_id',
          (await supabase.from('alliance_members').select('guild_id').eq('alliance_id', a.id)).data?.map((x: any) => x.guild_id) ?? []
        ).order('created_at', { ascending: false }).limit(10),
        supabase.from('events').select('*').in('guild_id',
          (await supabase.from('alliance_members').select('guild_id').eq('alliance_id', a.id)).data?.map((x: any) => x.guild_id) ?? []
        ).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
      ]);
      setGuilds((g.data ?? []).map((x: any) => x.guild).filter(Boolean));
      setPosts((p.data ?? []) as PostWithAuthor[]);
      setEvents(e.data ?? []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <Spinner className="py-20" />;
  if (!alliance) return <EmptyState icon={Shield} title="Alianza no encontrada" action={{ to: '/alianzas', label: 'Ver alianzas' }} />;

  return (
    <div>
      <Banner src={alliance.banner_url} className="h-48 sm:h-64" />
      <div className="container-app -mt-16">
        <Link to="/alianzas" className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-gold-600"><ArrowLeft className="h-4 w-4" /> Alianzas</Link>
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-white bg-ink-200 shadow-lg dark:border-ink-900 dark:bg-ink-800">
              {alliance.avatar_url ? <img src={alliance.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl font-display font-bold text-gold-500">{alliance.name[0]}</div>}
            </div>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold">{alliance.name}</h1>
              <p className="text-sm text-ink-500">{guilds.length} gremios</p>
            </div>
            {alliance.discord_url && <a href={alliance.discord_url} target="_blank" rel="noreferrer" className="btn-outline"><MessageCircle className="h-4 w-4" /> Discord</a>}
          </div>
          {alliance.description && <p className="mt-4 text-sm text-ink-700 dark:text-ink-200">{alliance.description}</p>}
        </div>

        <div className="mt-6 flex gap-1 border-b border-ink-200 dark:border-ink-800">
          {(['gremios', 'noticias', 'eventos'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-gold-500 text-gold-600 dark:text-gold-400' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'}`}>{t}</button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'gremios' && (
            guilds.length === 0 ? <EmptyState icon={Shield} title="Sin gremios" /> : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{guilds.map((g) => <GuildCard key={g.id} guild={g} />)}</div>
            )
          )}
          {tab === 'noticias' && (
            posts.length === 0 ? <EmptyState icon={Newspaper} title="Sin noticias" /> : (
              <div className="space-y-4">{posts.map((p) => <PostCardLite key={p.id} post={p} />)}</div>
            )
          )}
          {tab === 'eventos' && (
            events.length === 0 ? <EmptyState icon={Calendar} title="Sin eventos" /> : (
              <div className="space-y-2">{events.map((ev) => (
                <div key={ev.id} className="card p-3"><p className="font-medium">{ev.title}</p><p className="text-xs text-ink-500">{formatDateTime(ev.start_time)}</p></div>
              ))}</div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function PostCardLite({ post }: { post: PostWithAuthor }) {
  return (
    <Link to={`/publicacion/${post.id}`} className="card block p-4 card-hover">
      <p className="text-xs text-ink-500">{post.author?.display_name || post.author?.username}</p>
      <p className="mt-1 line-clamp-3 text-sm">{post.content}</p>
    </Link>
  );
}

function CreateAllianceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', discord_url: '', avatar_url: '', banner_url: '' });
  const [saving, setSaving] = useState(false);

  if (!profile) { onClose(); return null; }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return push({ type: 'error', message: 'Nombre obligatorio' });
    setSaving(true);
    const slug = slugify(form.name) + '-' + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.from('alliances').insert({ ...form, slug, owner_id: profile!.id }).select('slug').single();
    setSaving(false);
    if (error) return push({ type: 'error', message: error.message });
    push({ type: 'success', message: 'Alianza creada' });
    onCreated();
    navigate(`/alianza/${data!.slug}`);
  }

  return (
    <Modal open onClose={onClose} title="Crear alianza">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Nombre *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Descripción</label><textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><label className="label">Discord</label><input className="input" value={form.discord_url} onChange={(e) => setForm({ ...form, discord_url: e.target.value })} /></div>
        <ImageUpload
          label="Avatar"
          variant="avatar"
          folder="alliances"
          ownerId={profile.id}
          value={form.avatar_url || null}
          onChange={(url) => setForm({ ...form, avatar_url: url ?? '' })}
        />
        <ImageUpload
          label="Banner"
          variant="banner"
          folder="alliances"
          ownerId={profile.id}
          value={form.banner_url || null}
          onChange={(url) => setForm({ ...form, banner_url: url ?? '' })}
        />
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-ghost">Cancelar</button><button disabled={saving} className="btn-primary">{saving ? 'Creando...' : 'Crear'}</button></div>
      </form>
    </Modal>
  );
}
