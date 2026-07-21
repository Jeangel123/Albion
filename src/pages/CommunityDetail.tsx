import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Users, BadgeCheck, ArrowLeft, Settings, Castle, MessageSquare, Crown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { useRealtime } from '../lib/useRealtime';
import { useCommunities } from '../lib/useCommunities';
import { Banner } from '../components/Banner';
import { AvatarWithFrame } from '../components/AvatarWithFrame';
import { RankBadge } from '../components/RankBadge';
import { FounderName, isFounderRole } from '../components/FounderStyle';
import { Spinner, EmptyState } from '../components/ui';
import { Modal } from '../components/Modal';
import { ImageUpload } from '../components/ImageUpload';
import { ChatPanel } from '../components/ChatPanel';
import { slugify } from '../lib/format';
import type { Community, CommunityMember, Profile, MedievalRank, FrameRarity } from '../lib/types';

type MemberWithUser = CommunityMember & { user: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank' | 'role'> & { frame?: { rarity: FrameRarity; icon: string | null } | null } };

export default function CommunityDetailPage() {
  const { slug } = useParams();
  const { profile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const { isMember, membership, join, leave } = useCommunities();
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [tab, setTab] = useState<'chat' | 'miembros' | 'info'>('chat');
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const { data: c, error: cErr } = await supabase.from('communities').select('*').eq('slug', slug).maybeSingle();
        if (cErr) console.error('[community] load:', cErr.message);
        if (!c) { setLoading(false); return; }
        setCommunity(c as Community);
        const [m] = await Promise.all([
          supabase
            .from('community_members')
            .select('*, user:profiles(id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon)))')
            .eq('community_id', c.id)
            .order('joined_at', { ascending: false }),
        ]);
        if (m.error) console.error('[community] members:', m.error.message);
        setMembers((m.data ?? []) as unknown as MemberWithUser[]);
      } catch (err) {
        console.error('[community] fatal:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  useRealtime<Community>({
    table: 'communities',
    filter: `id=eq.${community?.id ?? ''}`,
    onEvent: ({ eventType, new: row }) => {
      if (eventType === 'DELETE' || !row) setCommunity(null);
      else setCommunity((prev) => (prev && prev.id === row.id ? { ...prev, ...row } : row as Community));
    },
  });

  const handleMessageEvent = useCallback(() => {}, []);
  void handleMessageEvent;

  const myMembership = community ? membership(community.id) : null;
  const isOwner = community?.owner_id === profile?.id;
  const isAdmin = myMembership?.role === 'admin' || isOwner;
  const joined = community ? isMember(community.id) : false;

  async function handleJoin() {
    if (!profile) return navigate('/login');
    if (!community) return;
    const { error } = await join(community.id);
    if (error) push({ type: 'error', message: error });
    else push({ type: 'success', message: 'Te uniste a la comunidad' });
  }

  async function handleLeave() {
    if (!profile || !community) return;
    const { error } = await leave(community.id);
    if (error) push({ type: 'error', message: error });
    else push({ type: 'success', message: 'Saliste de la comunidad' });
  }

  if (loading) return <Spinner className="py-20" />;
  if (!community) return <EmptyState icon={Users} title="Comunidad no encontrada" action={{ to: '/comunidades', label: 'Ver comunidades' }} />;

  return (
    <div>
      <Banner src={community.banner_url} className="h-48 sm:h-64" />
      <div className="container-app -mt-16">
        <Link to="/comunidades" className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-gold-600">
          <ArrowLeft className="h-4 w-4" /> Comunidades
        </Link>
        <div className="card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-ink-200 shadow-lg dark:border-ink-900 dark:bg-ink-800">
              {community.avatar_url ? (
                <img src={community.avatar_url} alt={community.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center font-display text-4xl font-bold text-gold-500">
                  {community.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{community.name}</h1>
                {community.is_verified && <BadgeCheck className="h-5 w-5 text-gold-500" />}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500 dark:text-ink-400">
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {community.member_count} miembros</span>
                <span className="inline-flex items-center gap-1"><Castle className="h-4 w-4" /> {community.category}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isAdmin && (
                <button onClick={() => setEditOpen(true)} className="btn-outline"><Settings className="h-4 w-4" /> Editar</button>
              )}
              {joined ? (
                <button onClick={handleLeave} className="btn-outline">Salir</button>
              ) : (
                <button onClick={handleJoin} className="btn-primary px-6 text-base">Unirme</button>
              )}
            </div>
          </div>
          {community.description && <p className="mt-4 text-sm text-ink-700 dark:text-ink-200">{community.description}</p>}
        </div>

        <div className="mt-6 flex gap-1 border-b border-ink-200 dark:border-ink-800">
          {(['chat', 'miembros', 'info'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-b-2 border-gold-500 text-gold-600 dark:text-gold-400' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'}`}>
              {t === 'chat' ? 'Chat' : t === 'miembros' ? 'Miembros' : 'Info'}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'chat' && (
            joined && community ? (
              <ChatPanel
                scope={{ kind: 'room', id: community.id }}
                currentUserId={profile?.id ?? ''}
                canModerate={isAdmin}
                useFrames
                storageFolder="communities"
              />
            ) : (
              <EmptyState icon={MessageSquare} title="Únete para chatear" hint="Necesitas ser miembro para ver y enviar mensajes." action={{ to: '#', label: '' }} />
            )
          )}
          {tab === 'miembros' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => (
                <Link key={m.id} to={`/perfil/${m.user.username}`} className="card flex items-center gap-3 p-3 card-hover">
                  <AvatarWithFrame src={m.user.avatar_url} alt={m.user.username} size="md" frameRarity={(m.user as any)?.frame?.rarity ?? null} frameIcon={(m.user as any)?.frame?.icon ?? null} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.user.display_name || m.user.username}</p>
                    <p className="text-xs text-ink-500 capitalize">{m.role === 'owner' ? 'Líder' : m.role === 'admin' ? 'Admin' : 'Miembro'}</p>
                  </div>
                  {m.role === 'owner' && <Crown className="h-4 w-4 text-gold-500" />}
                </Link>
              ))}
            </div>
          )}
          {tab === 'info' && (
            <div className="card space-y-4 p-5 text-sm">
              <div>
                <p className="label">Categoría</p>
                <p className="capitalize text-ink-700 dark:text-ink-200">{community.category}</p>
              </div>
              <div>
                <p className="label">Descripción</p>
                <p className="text-ink-700 dark:text-ink-200">{community.description || 'Sin descripción'}</p>
              </div>
              <div>
                <p className="label">Miembros</p>
                <p className="text-ink-700 dark:text-ink-200">{community.member_count}</p>
              </div>
              <div>
                <p className="label">Creada</p>
                <p className="text-ink-700 dark:text-ink-200">{new Date(community.created_at).toLocaleDateString('es-ES')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAdmin && editOpen && (
        <CommunityEditModal community={community} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}

function CommunityEditModal({ community, onClose }: { community: Community; onClose: () => void }) {
  const { push } = useToast();
  const { profile } = useAuth();
  const [form, setForm] = useState({
    name: community.name,
    description: community.description ?? '',
    category: community.category,
    avatar_url: community.avatar_url ?? '',
    banner_url: community.banner_url ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('communities')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', community.id);
    setSaving(false);
    if (error) return push({ type: 'error', message: error.message });
    push({ type: 'success', message: 'Comunidad actualizada' });
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Editar comunidad" size="lg">
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label">Nombre</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="label">Categoría</label>
          <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        {profile && (
          <>
            <ImageUpload
              label="Avatar"
              variant="avatar"
              folder="communities"
              ownerId={community.id}
              value={form.avatar_url || null}
              onChange={(url) => setForm({ ...form, avatar_url: url ?? '' })}
            />
            <ImageUpload
              label="Banner"
              variant="banner"
              folder="communities"
              ownerId={community.id}
              value={form.banner_url || null}
              onChange={(url) => setForm({ ...form, banner_url: url ?? '' })}
            />
          </>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}
