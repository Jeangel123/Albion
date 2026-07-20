import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Calendar, MessageSquare, UserPlus, UserCheck, Share2, Twitch, Youtube, Facebook, Instagram, Link as LinkIcon, Shield, Trophy, Users as UsersIcon, Star, Clock, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { useRealtime, upsertById, removeById } from '../lib/useRealtime';
import { Banner } from '../components/Banner';
import { PostCard } from '../components/PostCard';
import { RankBadge, RankProgress, RoleBadge } from '../components/RankBadge';
import { UserBadges } from '../components/Badges';
import { BadgeReviewModal } from '../components/BadgeReviewModal';
import { AvatarWithFrame } from '../components/AvatarWithFrame';
import { Spinner, EmptyState } from '../components/ui';
import { formatDate } from '../lib/format';
import { getUserSanctions, SANCTION_TYPES, type Sanction } from '../lib/moderation';
import { getUserAchievements, getRankTitle } from '../lib/gamification';
import type { UserAchievement } from '../lib/types';
import type { Profile, Post, Guild, Community } from '../lib/types';

type PostWithAuthor = Post & { author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank'> };

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
  const [tab, setTab] = useState<'publicaciones' | 'guardados' | 'sanciones'>('publicaciones');
  const [savedPosts, setSavedPosts] = useState<PostWithAuthor[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [frame, setFrame] = useState<{ rarity: string; icon: string | null } | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [stats, setStats] = useState<{ posts: number; communities: number; reputation: number; ageDays: number }>({ posts: 0, communities: 0, reputation: 0, ageDays: 0 });
  const [badgeReviewOpen, setBadgeReviewOpen] = useState(false);

  const isOwn = me?.id === profile?.id;

  // Live-sync this profile when it changes (avatar, banner, bio, etc.)
  useRealtime<Profile>({
    table: 'profiles',
    filter: profile?.id ? `id=eq.${profile.id}` : undefined,
    onEvent: ({ eventType, new: row }) => {
      if (eventType === 'DELETE') setProfile(null);
      else if (row) setProfile((prev) => (prev && prev.id === row.id ? { ...prev, ...row } : prev));
    },
  });

  // Live-sync guild info for this profile
  useRealtime<Guild>({
    table: 'guilds',
    filter: profile?.guild_id ? `id=eq.${profile.guild_id}` : undefined,
    onEvent: ({ eventType, new: row }) => {
      if (eventType === 'DELETE' || !row) setGuild(null);
      else if (row) setGuild((prev) => (prev && prev.id === row.id ? { ...prev, ...row } : (row as Guild)));
    },
  });

  // Live-sync posts by this author (INSERT/UPDATE/DELETE)
  const handlePostEvent = useCallback(({ eventType, new: row, old: oldRow }: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => {
    if (eventType === 'DELETE' && oldRow?.id) {
      setPosts((list) => removeById(list, oldRow.id));
    } else if (row?.id) {
      // Fetch the full row with author join for INSERT/UPDATE
      supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank)').eq('id', row.id).maybeSingle()
        .then(({ data }) => { if (data) setPosts((list) => upsertById(list, data as PostWithAuthor)); });
    }
  }, []);
  useRealtime<Post>({ table: 'posts', filter: profile?.id ? `author_id=eq.${profile.id}` : undefined, onEvent: handlePostEvent });

  // Load profile data only when username changes. The follow-status check
  // is split into its own effect so auth loading doesn't reset `loading`.
  useEffect(() => {
    if (!username) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const { data: p, error } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
        if (!active) return;
        if (error) { console.error('[profile] load error:', error.message); setLoading(false); return; }
        if (!p) { setLoading(false); return; }
        setProfile(p as Profile);
        const [postData, guildData, fol, folg] = await Promise.all([
          supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank)').eq('author_id', p.id).order('created_at', { ascending: false }),
          p.guild_id ? supabase.from('guilds').select('*').eq('id', p.guild_id).maybeSingle() : Promise.resolve({ data: null }),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', p.id),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', p.id),
        ]);
        if (!active) return;
        setPosts((postData.data ?? []) as PostWithAuthor[]);
        setGuild((guildData.data ?? null) as Guild | null);
        setFollowers(fol.count ?? 0);
        setFollowing(folg.count ?? 0);
        const { data: uf } = await supabase
          .from('user_frames')
          .select('frame:avatar_frames(rarity, icon)')
          .eq('user_id', p.id)
          .eq('is_equipped', true)
          .maybeSingle();
        if (!active) return;
        if (uf?.frame) setFrame(uf.frame as any);
        const [achData, commCount] = await Promise.all([
          getUserAchievements(p.id),
          supabase.from('community_members').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
        ]);
        if (!active) return;
        setAchievements(achData);
        const ageMs = Date.now() - new Date(p.created_at).getTime();
        setStats({
          posts: postData.data?.length ?? 0,
          communities: commCount.count ?? 0,
          reputation: p.reputation_points ?? 0,
          ageDays: Math.floor(ageMs / 86400000),
        });
      } catch (err) {
        console.error('[profile] unexpected error:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Separately check follow status when both users are known.
  useEffect(() => {
    if (!me || !profile || me.id === profile.id) { setIsFollowing(false); return; }
    let active = true;
    (async () => {
      const { data: f } = await supabase.from('follows').select('id').eq('follower_id', me.id).eq('following_id', profile.id).maybeSingle();
      if (active) setIsFollowing(!!f);
    })();
    return () => { active = false; };
  }, [me?.id, profile?.id]);

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
      .select('post:posts(*, author:profiles(id, username, display_name, avatar_url, medieval_rank))')
      .eq('user_id', me.id);
    setSavedPosts((data ?? []).map((x: any) => x.post));
  }

  async function loadSanctions() {
    if (!me) return;
    setSanctions(await getUserSanctions(me.id));
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
            <div className="h-28 w-28 sm:h-32 sm:w-32">
              <AvatarWithFrame
                src={profile.avatar_url}
                alt={profile.username}
                size="xl"
                frameRarity={frame?.rarity as any}
                frameIcon={frame?.icon}
              />
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
        <div className="card-medieval p-5 animate-fade-in">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{profile.display_name || profile.username}</h1>
              <RankBadge rank={profile.medieval_rank} />
              <RoleBadge role={profile.role} />
            </div>
            <UserBadges profile={profile} className="mt-2" />
            <p className="text-sm font-medium text-gold-600 dark:text-gold-400">{getRankTitle(profile.medieval_rank)}</p>
            <p className="text-sm text-ink-500">@{profile.username}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
              <span><strong className="text-ink-800 dark:text-ink-100">{followers}</strong> seguidores</span>
              <span><strong className="text-ink-800 dark:text-ink-100">{following}</strong> siguiendo</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(profile.created_at)}</span>
            </div>
          </div>

          {profile.bio && <p className="mt-4 text-sm text-ink-700 dark:text-ink-200">{profile.bio}</p>}

          <div className="mt-4"><RankProgress points={profile.reputation_points} /></div>

          {/* Estadísticas */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard icon={MessageSquare} label="Publicaciones" value={stats.posts} />
            <StatCard icon={UsersIcon} label="Comunidades" value={stats.communities} />
            <StatCard icon={Star} label="Reputación" value={stats.reputation} />
            <StatCard icon={Clock} label="Antigüedad" value={`${stats.ageDays}d`} />
          </div>

          {/* Logros / Insignias */}
          {isOwn && (
            <button onClick={() => setBadgeReviewOpen(true)} className="btn-outline mt-3 text-xs">
              <Award className="h-3.5 w-3.5" /> Solicitar insignia
            </button>
          )}
          {achievements.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500"><Trophy className="h-3.5 w-3.5 text-gold-500" /> Insignias</p>
              <div className="flex flex-wrap gap-2">
                {achievements.map((ua) => (
                  <div key={ua.id} title={ua.achievement?.description ?? ''} className="flex items-center gap-1.5 rounded-full bg-gold-50 px-3 py-1.5 dark:bg-gold-950/30">
                    <span className="text-lg">{ua.achievement?.icon ?? '🏅'}</span>
                    <span className="text-xs font-medium text-ink-700 dark:text-ink-200">{ua.achievement?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {guild && (
            <Link to={`/gremio/${guild.slug}`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-100 to-gold-50 px-3 py-1.5 text-sm transition hover:shadow-sm dark:from-gold-950/40 dark:to-ink-900">
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
            <TabBtn active={tab === 'sanciones'} onClick={() => { setTab('sanciones'); loadSanctions(); }}>Sanciones</TabBtn>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {tab === 'publicaciones' && (
            posts.length === 0 ? <EmptyState icon={MessageSquare} title="Sin publicaciones" /> : posts.map((p, i) => <div key={p.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}><PostCard post={p} author={p.author} /></div>)
          )}
          {tab === 'guardados' && (
            savedPosts.length === 0 ? <EmptyState icon={MessageSquare} title="Nada guardado" /> : savedPosts.map((p, i) => <div key={p.id} className="fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}><PostCard post={p} author={p.author} /></div>)
          )}
          {tab === 'sanciones' && (
            sanctions.length === 0 ? (
              <EmptyState icon={Shield} title="Sin sanciones" hint="Tu historial está limpio." />
            ) : (
              <div className="space-y-2">
                {sanctions.map((s) => {
                  const stype = SANCTION_TYPES.find((t) => t.key === s.type);
                  return (
                    <div key={s.id} className="card-medieval p-4 flex items-start gap-3">
                      <div className="text-xl">{stype?.emoji ?? '📋'}</div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {stype && <span className={`chip text-[10px] ${stype.color}`}>{stype.label}</span>}
                          <span className={`chip text-[10px] ${s.is_active ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>
                            {s.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        {s.reason && <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">{s.reason}</p>}
                        <p className="mt-0.5 text-xs text-ink-400">
                          {formatDate(s.created_at)}
                          {s.expires_at && ` · expira ${formatDate(s.expires_at)}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
      {badgeReviewOpen && isOwn && <BadgeReviewModal userId={profile.id} onClose={() => setBadgeReviewOpen(false)} />}
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

function StatCard({ icon: Icon, label, value }: { icon: typeof MessageSquare; label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3 text-center dark:bg-ink-800/50">
      <Icon className="mx-auto h-4 w-4 text-gold-500" />
      <p className="mt-1 font-display text-lg font-bold text-ink-900 dark:text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-500">{label}</p>
    </div>
  );
}
