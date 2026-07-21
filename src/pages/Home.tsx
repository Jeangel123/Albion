import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Newspaper, Video, ImageIcon, Sparkles, Users, Shield, ScrollText, Crown, Swords, Landmark, Globe, MessageSquare, ArrowRight, Flame, TrendingUp, Castle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { SectionTitle, Spinner } from '../components/ui';
import { useRealtime, upsertById, removeById } from '../lib/useRealtime';
import { EVENT_TYPES, MEDIEVAL_RANKS, type Guild, type Post, type Profile, type AlbionEvent } from '../lib/types';
import { formatDateTime } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import { RankBadge } from '../components/RankBadge';

type PostWithAuthor = Post & { author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank'> };

export default function HomePage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[] | null>(null);
  const [guilds, setGuilds] = useState<Guild[] | null>(null);
  const [news, setNews] = useState<PostWithAuthor[] | null>(null);
  const [events, setEvents] = useState<AlbionEvent[] | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [feedTab, setFeedTab] = useState<'recent' | 'news'>('recent');
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [postsRes, guildsRes, newsRes, eventsRes] = await Promise.all([
          supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank)').order('created_at', { ascending: false }).limit(10),
          supabase.from('guilds').select('*').eq('is_featured', true).limit(4),
          supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank)').eq('is_news', true).order('created_at', { ascending: false }).limit(3),
          supabase.from('events').select('*').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
        ]);
        if (postsRes.error) console.error('[home] posts:', postsRes.error.message);
        if (guildsRes.error) console.error('[home] guilds:', guildsRes.error.message);
        if (newsRes.error) console.error('[home] news:', newsRes.error.message);
        if (eventsRes.error) console.error('[home] events:', eventsRes.error.message);
        setPosts(postsRes.data as PostWithAuthor[] ?? []);
        setGuilds(guildsRes.data ?? []);
        setNews(newsRes.data as PostWithAuthor[] ?? []);
        setEvents(eventsRes.data ?? []);

        const [imgRes, vidRes] = await Promise.all([
          supabase.from('posts').select('media_urls').eq('type', 'image').order('created_at', { ascending: false }).limit(8),
          supabase.from('posts').select('media_urls').eq('type', 'video').order('created_at', { ascending: false }).limit(6),
        ]);
        if (imgRes.error) console.error('[home] images:', imgRes.error.message);
        if (vidRes.error) console.error('[home] videos:', vidRes.error.message);
        setImages((imgRes.data ?? []).flatMap((p: any) => p.media_urls ?? []));
        setVideos((vidRes.data ?? []).flatMap((p: any) => p.media_urls ?? []));
      } catch (err) {
        console.error('[home] fatal:', err);
        setPosts([]); setGuilds([]); setNews([]); setEvents([]);
      }
    })();
  }, []);

  useEffect(() => {
    supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (typeof count === 'number') setOnlineCount(count);
    });
  }, []);

  // Live-sync posts feed (INSERT/UPDATE/DELETE)
  const handlePostEvent = useCallback(({ eventType, new: row, old: oldRow }: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => {
    if (eventType === 'DELETE' && oldRow?.id) {
      setPosts((list) => (list ? removeById(list, oldRow.id) : list));
    } else if (row?.id) {
      supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank)').eq('id', row.id).maybeSingle()
        .then(({ data }) => {
          if (data) setPosts((list) => list ? upsertById(list, data as PostWithAuthor) : [data as PostWithAuthor]);
        });
    }
  }, []);
  useRealtime<Post>({ table: 'posts', onEvent: handlePostEvent });

  const displayedPosts = feedTab === 'news' ? news : posts;

  return (
    <div className="container-app py-4 sm:py-6">
      {/* Hero — compact, modern */}
      <section className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-950 to-ink-900 p-6 sm:p-8">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(196,144,42,0.5), transparent 40%), radial-gradient(circle at 85% 80%, rgba(196,144,42,0.35), transparent 45%)' }} />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl float" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <span className="chip bg-gold-500/15 text-gold-300 backdrop-blur animate-fade-in"><Sparkles className="h-3.5 w-3.5" /> {t('hero.badge')}</span>
            <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-white animate-slide-up sm:text-4xl">
              {t('hero.title1')} <span className="text-gradient-gold">{t('hero.title2')}</span>
            </h1>
            <p className="mt-2 text-sm text-ink-200 animate-slide-up sm:text-base" style={{ animationDelay: '0.1s' }}>
              {t('hero.desc')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {profile ? (
                <Link to={`/perfil/${profile.username}`} className="btn-primary text-sm">Mi perfil</Link>
              ) : (
                <Link to="/registro" className="btn-primary text-sm">{t('hero.cta1')}</Link>
              )}
              <Link to="/gremios" className="btn-outline border-gold-400/40 text-white hover:bg-white/10 text-sm">{t('hero.cta2')}</Link>
            </div>
          </div>
          {/* Stats badges */}
          {onlineCount !== null && (
            <div className="hidden shrink-0 flex-col gap-2 sm:flex">
              <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 backdrop-blur">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{onlineCount.toLocaleString('es')}</p>
                  <p className="text-[10px] text-ink-300">miembros</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Quick access strip — chat, whispers, and key sections in a compact horizontal row */}
      <section className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        <QuickAccess to="/mensajes" icon={Globe} label="Chat Global" accent="text-gold-500" bg="bg-gold-500/10" />
        {profile && <QuickAccess to="/whispers" icon={MessageSquare} label="Whispers" accent="text-purple-500" bg="bg-purple-500/10" />}
        <QuickAccess to="/gremios" icon={Swords} label="Gremios" accent="text-red-500" bg="bg-red-500/10" />
        <QuickAccess to="/alianzas" icon={Shield} label="Alianzas" accent="text-sky-500" bg="bg-sky-500/10" />
        <QuickAccess to="/comunidades" icon={Castle} label="Comunidades" accent="text-blue-500" bg="bg-blue-500/10" />
        <QuickAccess to="/eventos" icon={Calendar} label="Eventos" accent="text-emerald-500" bg="bg-emerald-500/10" />
      </section>

      {/* Main content — 3-column modern social layout */}
      <div className="grid gap-5 lg:grid-cols-[220px_1fr_320px]">
        {/* Left rail — navigation + user card + rangos (desktop only) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {/* User mini-card */}
            {profile && (
              <div className="card-medieval p-4">
                <div className="flex flex-col items-center text-center">
                  <Avatar src={profile.avatar_url} alt={profile.username} size="lg" to={`/perfil/${profile.username}`} />
                  <Link to={`/perfil/${profile.username}`} className="mt-2 font-display text-sm font-semibold text-ink-900 hover:text-gold-600 dark:text-white dark:hover:text-gold-400">
                    {profile.display_name || profile.username}
                  </Link>
                  <p className="text-xs text-ink-500">@{profile.username}</p>
                  {profile.medieval_rank && <div className="mt-1.5"><RankBadge rank={profile.medieval_rank as any} size="sm" /></div>}
                </div>
              </div>
            )}

            {/* Navigation shortcuts */}
            <nav className="card p-2">
              <NavItem to="/gremios" icon={Swords} label="Gremios" />
              <NavItem to="/comunidades" icon={Castle} label="Comunidades" />
              <NavItem to="/alianzas" icon={Shield} label="Alianzas" />
              <NavItem to="/eventos" icon={Calendar} label="Eventos" />
              <NavItem to="/ranking" icon={Crown} label="Ranking" />
              <NavItem to="/consejo" icon={ScrollText} label="Consejo" />
              {profile && <NavItem to="/mensajes" icon={Globe} label="Chat Global" />}
              {profile && <NavItem to="/whispers" icon={MessageSquare} label="Whispers" />}
            </nav>

            {/* Rangos compacto */}
            <div className="card p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-500">
                <Trophy className="h-3.5 w-3.5 text-gold-500" /> Rangos
              </p>
              <div className="space-y-1.5">
                {MEDIEVAL_RANKS.slice().reverse().slice(0, 5).map((r) => (
                  <div key={r.key} className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-gold-50 dark:hover:bg-gold-950/30">
                    <span className="text-base">{r.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink-800 dark:text-ink-100">{r.label}</p>
                      <p className="text-[10px] text-ink-400">{r.min_points} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Center — Feed (the star) */}
        <div className="min-w-0 space-y-4">
          <CreatePost />

          {/* Feed tabs */}
          <div className="flex items-center gap-1 border-b border-ink-200 pb-px dark:border-ink-800">
            <FeedTab active={feedTab === 'recent'} onClick={() => setFeedTab('recent')} icon={Flame} label="Recientes" />
            <FeedTab active={feedTab === 'news'} onClick={() => setFeedTab('news')} icon={Newspaper} label="Noticias" />
          </div>

          {/* Feed */}
          {!displayedPosts ? <Spinner /> : displayedPosts.length === 0 ? (
            <div className="card p-8 text-center text-sm text-ink-500">
              {feedTab === 'news' ? 'Sin noticias.' : 'Aún no hay publicaciones. ¡Sé el primero!'}
            </div>
          ) : (
            <div className="space-y-3.5">
              {displayedPosts.map((p) => <PostCard key={p.id} post={p} author={p.author} />)}
            </div>
          )}
        </div>

        {/* Right rail — widgets */}
        <aside className="space-y-4">
          <div className="sticky top-20 space-y-4">
            {/* Chat Global CTA — compact */}
            <Link
              to="/mensajes"
              className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-ink-900 to-ink-800 p-3.5 shadow-md transition hover:shadow-lg"
            >
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 10% 50%, rgba(196,144,42,0.4), transparent 50%)' }} />
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/20 ring-1 ring-gold-500/40 transition group-hover:scale-110">
                <Globe className="h-5 w-5 text-gold-400" />
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-white">Chat Global</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" /> Live
                  </span>
                </div>
                <p className="truncate text-[11px] text-ink-300">Únete a la conversación</p>
              </div>
              <ArrowRight className="relative h-4 w-4 shrink-0 text-gold-400 transition group-hover:translate-x-1" />
            </Link>

            {/* Featured guilds */}
            <div className="card-medieval p-4">
              <SectionTitle title={t('section.featured')} action={{ to: '/gremios', label: t('common.search') }} />
              {!guilds ? <Spinner /> : guilds.length === 0 ? (
                <p className="text-sm text-ink-500">{t('guilds.empty')}</p>
              ) : (
                <div className="space-y-2.5">
                  {guilds.map((g) => (
                    <Link key={g.id} to={`/gremio/${g.slug}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-gold-50 dark:hover:bg-gold-950/30">
                      <div className="h-10 w-10 overflow-hidden rounded-lg bg-ink-200 dark:bg-ink-800">
                        {g.avatar_url ? <img src={g.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-display font-bold text-gold-500">{g.name[0]}</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{g.name}</p>
                        <p className="text-xs text-ink-500">{g.member_count} miembros</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* News */}
            <div className="card p-4">
              <SectionTitle title="Noticias" />
              {!news ? <Spinner /> : news.length === 0 ? (
                <p className="text-sm text-ink-500">Sin noticias.</p>
              ) : (
                <div className="space-y-2.5">
                  {news.map((n) => (
                    <Link key={n.id} to={`/publicacion/${n.id}`} className="block rounded-xl p-2 transition hover:bg-ink-100 dark:hover:bg-ink-800">
                      <div className="flex items-center gap-1.5 text-xs text-gold-600 dark:text-gold-400"><Newspaper className="h-3.5 w-3.5" /> Noticia</div>
                      <p className="mt-1 line-clamp-2 text-sm font-medium">{n.content}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Events */}
            <div className="card p-4">
              <SectionTitle title="Próximos eventos" action={{ to: '/eventos', label: 'Calendario' }} />
              {!events ? <Spinner /> : events.length === 0 ? (
                <p className="text-sm text-ink-500">No hay eventos próximos.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => {
                    const et = EVENT_TYPES.find((x) => x.key === ev.type);
                    return (
                      <Link key={ev.id} to={`/eventos`} className="block rounded-xl p-2 transition hover:bg-ink-100 dark:hover:bg-ink-800">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${et?.color ?? 'bg-gold-500'}`} />
                          <p className="truncate text-sm font-medium">{ev.title}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-500">{formatDateTime(ev.start_time)}</p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Images */}
            {images.length > 0 && (
              <div className="card p-4">
                <SectionTitle title="Imágenes" />
                <div className="grid grid-cols-3 gap-1.5">
                  {images.slice(0, 6).map((url, i) => (
                    <div key={i} className="aspect-square overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                      <img src={url} alt="" className="h-full w-full object-cover transition hover:scale-110" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
              <div className="card p-4">
                <SectionTitle title="Videos" />
                <div className="space-y-2">
                  {videos.slice(0, 3).map((url, i) => (
                    <video key={i} src={url} controls className="w-full rounded-lg bg-black" />
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="card-medieval p-3">
              <div className="grid grid-cols-2 gap-1.5">
                <QuickLink to="/ranking" icon={Trophy} label={t('quick.rankings')} />
                <QuickLink to="/alianzas" icon={Shield} label={t('quick.alliances')} />
                <QuickLink to="/eventos" icon={Calendar} label={t('quick.events')} />
                <QuickLink to="/buscar" icon={Users} label={t('quick.search')} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof Trophy; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition hover:bg-gold-50 hover:shadow-sm dark:hover:bg-gold-950/30">
      <Icon className="h-5 w-5 text-gold-500 transition-transform hover:scale-110" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

function QuickAccess({ to, icon: Icon, label, accent, bg }: { to: string; icon: typeof Trophy; label: string; accent: string; bg: string }) {
  return (
    <Link to={to} className="card card-hover group flex flex-col items-center gap-1.5 p-3 text-center">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} transition group-hover:scale-110`}>
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <span className="text-xs font-semibold text-ink-800 dark:text-ink-100">{label}</span>
    </Link>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: typeof Trophy; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-gold-50 hover:text-gold-600 dark:text-ink-200 dark:hover:bg-gold-950/30 dark:hover:text-gold-400">
      <Icon className="h-4 w-4 text-gold-500" />
      {label}
    </Link>
  );
}

function FeedTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Trophy; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition border-b-2 ${active ? 'border-gold-500 text-gold-600 dark:text-gold-400' : 'border-transparent text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
