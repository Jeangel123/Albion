import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Calendar, MessageSquare, UserPlus, UserCheck, Share2, BadgeCheck, Twitch, Youtube, Facebook, Instagram, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Banner } from '../components/Banner';
import { PostCard } from '../components/PostCard';
import { Spinner, EmptyState } from '../components/ui';
import { formatDate } from '../lib/format';
import type { Profile, Post, Guild } from '../lib/types';

type PostWithAuthor = Post & { author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> };

export default function ProfilePage() {
  const { username } = useParams();
  const { profile: me } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [tab, setTab] = useState<'publicaciones' | 'guardados'>('publicaciones');
  const [savedPosts, setSavedPosts] = useState<PostWithAuthor[]>([]);

  const isOwn = me?.id === profile?.id;

  useEffect(() => {
    if (!username) return;
    (async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
      if (!p) { setLoading(false); return; }
      setProfile(p as Profile);
      const [postData, guildData, fol, folg] = await Promise.all([
        supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url)').eq('author_id', p.id).order('created_at', { ascending: false }),
        p.guild_id ? supabase.from('guilds').select('*').eq('id', p.guild_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', p.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', p.id),
      ]);
      setPosts((postData.data ?? []) as PostWithAuthor[]);
      setGuild((guildData.data ?? null) as Guild | null);
      setFollowers(fol.count ?? 0);
      setFollowing(folg.count ?? 0);
      if (me && me.id !== p.id) {
        const { data: f } = await supabase.from('follows').select('id').eq('follower_id', me.id).eq('following_id', p.id).maybeSingle();
        setIsFollowing(!!f);
      }
      setLoading(false);
    })();
  }, [username, me]);

  async function toggleFollow() {
    if (!me) return navigate('/login');
    if (!profile) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', profile.id);
      setIsFollowing(false);
      setFollowers((c) => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: me.id, following_id: profile.id });
      setIsFollowing(true);
      setFollowers((c) => c + 1);
      push({ type: 'success', message: `Sigues a ${profile.username}` });
    }
  }

  function share() {
    navigator.clipboard.writeText(`${window.location.origin}/perfil/${profile!.username}`);
    push({ type: 'success', message: 'Perfil copiado' });
  }

  async function loadSaved() {
    if (!me) return;
    const { data } = await supabase
      .from('saved_posts')
      .select('post:posts(*, author:profiles(id, username, display_name, avatar_url))')
      .eq('user_id', me.id);
    setSavedPosts((data ?? []).map((x: any) => x.post));
  }

  if (loading) return <Spinner className="py-20" />;
  if (!profile) return <EmptyState icon={MessageSquare} title="Perfil no encontrado" action={{ to: '/', label: 'Inicio' }} />;

  return (
    <div>
      {/* Portada: banner como fondo + avatar superpuesto */}
      <div className="relative">
        <Banner src={profile.banner_url} className="h-44 sm:h-60" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="container-app absolute inset-x-0 bottom-0 translate-y-1/2">
          <div className="flex items-end justify-between gap-4">
            <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-ink-200 shadow-2xl dark:border-ink-900 dark:bg-ink-800 sm:h-32 sm:w-32">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-display font-bold text-gold-500">
                  {profile.username[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              {isOwn ? (
                <Link to="/ajustes" className="btn-outline">Editar perfil</Link>
              ) : (
                <button onClick={toggleFollow} className={isFollowing ? 'btn-outline' : 'btn-primary'}>
                  {isFollowing ? <><UserCheck className="h-4 w-4" /> Siguiendo</> : <><UserPlus className="h-4 w-4" /> Seguir</>}
                </button>
              )}
              <button onClick={share} className="btn-ghost"><Share2 className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-app mt-20">
        <div className="card p-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{profile.display_name || profile.username}</h1>
              {profile.is_verified && <BadgeCheck className="h-5 w-5 text-gold-500" />}
            </div>
            <p className="text-sm text-ink-500">@{profile.username}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
              <span><strong className="text-ink-800 dark:text-ink-100">{followers}</strong> seguidores</span>
              <span><strong className="text-ink-800 dark:text-ink-100">{following}</strong> siguiendo</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(profile.created_at)}</span>
            </div>
          </div>

          {profile.bio && <p className="mt-4 text-sm text-ink-700 dark:text-ink-200">{profile.bio}</p>}

          {guild && (
            <Link to={`/gremio/${guild.slug}`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-ink-100 px-3 py-1.5 text-sm hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700">
              <div className="h-5 w-5 overflow-hidden rounded bg-ink-300 dark:bg-ink-700">{guild.avatar_url && <img src={guild.avatar_url} alt="" className="h-full w-full object-cover" />}</div>
              {guild.name}
            </Link>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {profile.discord && <SocialLink href={profile.discord} icon={MessageSquare} label="Discord" />}
            {profile.twitch && <SocialLink href={profile.twitch} icon={Twitch} label="Twitch" />}
            {profile.youtube && <SocialLink href={profile.youtube} icon={Youtube} label="YouTube" />}
            {profile.instagram && <SocialLink href={profile.instagram} icon={Instagram} label="Instagram" />}
            {profile.facebook && <SocialLink href={profile.facebook} icon={Facebook} label="Facebook" />}
            {profile.custom_link && <SocialLink href={profile.custom_link} icon={LinkIcon} label="Enlace" />}
          </div>
        </div>

        {isOwn && (
          <div className="mt-6 flex gap-1 border-b border-ink-200 dark:border-ink-800">
            <TabBtn active={tab === 'publicaciones'} onClick={() => setTab('publicaciones')}>Publicaciones</TabBtn>
            <TabBtn active={tab === 'guardados'} onClick={() => { setTab('guardados'); loadSaved(); }}>Guardados</TabBtn>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {tab === 'publicaciones' && (
            posts.length === 0 ? <EmptyState icon={MessageSquare} title="Sin publicaciones" /> : posts.map((p) => <PostCard key={p.id} post={p} author={p.author} />)
          )}
          {tab === 'guardados' && (
            savedPosts.length === 0 ? <EmptyState icon={MessageSquare} title="Nada guardado" /> : savedPosts.map((p) => <PostCard key={p.id} post={p} author={p.author} />)
          )}
        </div>
      </div>
    </div>
  );
}

function SocialLink({ href, icon: Icon, label }: { href: string; icon: typeof Twitch; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="chip bg-ink-100 text-ink-600 hover:bg-gold-100 hover:text-gold-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-gold-950 dark:hover:text-gold-300">
      <Icon className="h-3.5 w-3.5" /> {label}
    </a>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2.5 text-sm font-medium transition ${active ? 'border-b-2 border-gold-500 text-gold-600 dark:text-gold-400' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'}`}>
      {children}
    </button>
  );
}
