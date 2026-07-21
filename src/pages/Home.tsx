import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Newspaper, Video, ImageIcon, Sparkles, Users, Shield, Swords, Globe, ArrowRight, Flame, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { Stories } from '../components/Stories';
import { SectionTitle, Spinner } from '../components/ui';
import { useRealtime, upsertById, removeById } from '../lib/useRealtime';
import { EVENT_TYPES, type Guild, type Post, type Profile, type AlbionEvent } from '../lib/types';
import { formatDateTime } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import { RankBadge } from '../components/RankBadge';

type PostWithAuthor = Post & { author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank'> };

type FeedFilter = 'all' | 'videos' | 'images' | 'guilds' | 'guides';

const FILTERS: { key: FeedFilter; label: string; icon: typeof Trophy }[] = [
  { key: 'all', label: 'Todo', icon: Sparkles },
  { key: 'videos', label: 'Videos', icon: Video },
  { key: 'images', label: 'Imágenes', icon: ImageIcon },
  { key: 'guilds', label: 'Gremios', icon: Swords },
  { key: 'guides', label: 'Guías', icon: BookOpen },
];

const GUIDE_TAG_RE = /^(guia|guía|guide|tutorial|howto)$/i;

export default function HomePage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[] | null>(null);
  const [guilds, setGuilds] = useState<Guild[] | null>(null);
  const [news, setNews] = useState<PostWithAuthor[] | null>(null);
  const [events, setEvents] = useState<AlbionEvent[] | null>(null);
  const [feedTab, setFeedTab] = useState<'recent' | 'news'>('recent');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

  useEffect(() => {
    (async () => {
      try {
        const [postsRes, guildsRes, newsRes, eventsRes] = await Promise.all([
          supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank)').order('created_at', { ascending: false }).limit(15),
          supabase.from('guilds').select('*').eq('is_featured', true).limit(3),
          supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank)').eq('is_news', true).order('created_at', { ascending: false }).limit(3),
          supabase.from('events').select('*').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(4),
        ]);
        if (postsRes.error) console.error('[home] posts:', postsRes.error.message);
        if (guildsRes.error) console.error('[home] guilds:', guildsRes.error.message);
        if (newsRes.error) console.error('[home] news:', newsRes.error.message);
        if (eventsRes.error) console.error('[home] events:', eventsRes.error.message);
        setPosts(postsRes.data as PostWithAuthor[] ?? []);
        setGuilds(guildsRes.data ?? []);
        setNews(newsRes.data as PostWithAuthor[] ?? []);
        setEvents(eventsRes.data ?? []);
      } catch (err) {
        console.error('[home] fatal:', err);
        setPosts([]); setGuilds([]); setNews([]); setEvents([]);
      }
    })();
  }, []);

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

  const sourcePosts = feedTab === 'news' ? news : posts;
  const filteredPosts: PostWithAuthor[] = (sourcePosts ?? []).filter((p) => {
    switch (feedFilter) {
      case 'videos': return p.type === 'video';
      case 'images': return p.type === 'image';
      case 'guilds': return !!p.guild_id;
      case 'guides': return (p.tags ?? []).some((tag: string) => GUIDE_TAG_RE.test(tag));
      default: return true;
    }
  });

  return (
    <div className="container-app py-4 sm:py-6">
      {/* Stories bar */}
      <Stories />

      {/* Main content — feed-centric layout */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Center — Feed (the protagonist) */}
        <div className="min-w-0 space-y-4">
          <CreatePost />

          {/* Feed tabs */}
          <div className="flex items-center gap-1 border-b border-ink-200 pb-px dark:border-ink-800">
            <FeedTab active={feedTab === 'recent'} onClick={() => setFeedTab('recent')} icon={Flame} label="Recientes" />
            <FeedTab active={feedTab === 'news'} onClick={() => setFeedTab('news')} icon={Newspaper} label="Noticias" />
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {FILTERS.map((f) => (
              <FilterChip key={f.key} active={feedFilter === f.key} onClick={() => setFeedFilter(f.key)} icon={f.icon} label={f.label} />
            ))}
          </div>

          {/* Feed — publications only */}
          {posts === null ? <Spinner /> : filteredPosts.length === 0 ? (
            <div className="card p-8 text-center text-sm text-ink-500">
              No hay contenido para este filtro.
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredPosts.map((p) => (
                <PostCard key={`p-${p.id}`} post={p} author={p.author} />
              ))}
            </div>
          )}
        </div>

        {/* Right rail — compact widgets */}
        <aside className="space-y-4">
          <div className="sticky top-32 space-y-4 lg:top-36">
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

            {/* Chat Global CTA */}
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

      {/* Bottom padding for mobile nav */}
      <div className="h-16 lg:hidden" />
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

function FilterChip({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Trophy; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-gold-500 text-ink-950 shadow-sm' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
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
