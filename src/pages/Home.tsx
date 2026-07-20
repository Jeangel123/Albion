import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Newspaper, Video, ImageIcon, Sparkles, Users, Shield, ScrollText, Crown, Swords, Landmark } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { GuildCard } from '../components/GuildCard';
import { SectionTitle, Spinner } from '../components/ui';
import { useRealtime, upsertById, removeById } from '../lib/useRealtime';
import { EVENT_TYPES, MEDIEVAL_RANKS, type Guild, type Post, type Profile, type AlbionEvent } from '../lib/types';
import { formatDateTime } from '../lib/format';
import { useI18n } from '../lib/i18n';

type PostWithAuthor = Post & { author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank'> };

export default function HomePage() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<PostWithAuthor[] | null>(null);
  const [guilds, setGuilds] = useState<Guild[] | null>(null);
  const [news, setNews] = useState<PostWithAuthor[] | null>(null);
  const [events, setEvents] = useState<AlbionEvent[] | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);

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

  return (
    <div className="container-app py-6">
      {/* Hero */}
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-950 to-ink-900 p-8 sm:p-12">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(196,144,42,0.5), transparent 40%), radial-gradient(circle at 85% 80%, rgba(196,144,42,0.35), transparent 45%)' }} />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(196,144,42,0.15), transparent 60%)' }} />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl float" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-gold-600/10 blur-3xl float" style={{ animationDelay: '1s' }} />
        <div className="relative max-w-2xl">
          <span className="chip bg-gold-500/15 text-gold-300 backdrop-blur animate-fade-in"><Sparkles className="h-3.5 w-3.5" /> {t('hero.badge')}</span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-white animate-slide-up sm:text-5xl">
            {t('hero.title1')} <span className="text-gradient-gold">{t('hero.title2')}</span>
          </h1>
          <p className="mt-3 text-base text-ink-200 animate-slide-up sm:text-lg" style={{ animationDelay: '0.1s' }}>
            {t('hero.desc')}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/registro" className="btn-primary">{t('hero.cta1')}</Link>
            <Link to="/gremios" className="btn-outline border-gold-400/40 text-white hover:bg-white/10">{t('hero.cta2')}</Link>
          </div>
        </div>
      </section>

      {/* Secciones destacadas del Imperio */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ImperioSection to="/gremios" icon={Swords} title="Gremios" desc="Únete o funda gremios" accent="from-red-500/10 to-orange-500/10" />
        <ImperioSection to="/comunidades" icon={Users} title="Comunidades" desc="Conecta con afines" accent="from-sky-500/10 to-blue-500/10" />
        <ImperioSection to="/eventos" icon={Calendar} title="Eventos" desc="Organiza y participa" accent="from-emerald-500/10 to-teal-500/10" />
        <ImperioSection to="/consejo" icon={ScrollText} title="Consejo del Reino" desc="Propón y vota ideas" accent="from-amber-500/10 to-yellow-500/10" />
        <ImperioSection to="/ranking" icon={Crown} title="Rangos" desc="Escala la nobleza" accent="from-violet-500/10 to-purple-500/10" />
      </section>

      {/* Rangos del Reino */}
      <section className="mb-8 card-medieval p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-900 dark:text-white">Rangos del Reino</h2>
        <div className="flex flex-wrap gap-2">
          {MEDIEVAL_RANKS.map((r) => (
            <div key={r.key} className="flex items-center gap-2 rounded-full bg-ink-100 px-3 py-1.5 dark:bg-ink-800">
              <span className="text-lg">{r.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-ink-800 dark:text-ink-100">{r.label}</p>
                <p className="text-[10px] text-ink-500">{r.min_points} pts</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <CreatePost />
          <div>
            <SectionTitle title="Publicaciones recientes" />
            {!posts ? <Spinner /> : posts.length === 0 ? (
              <p className="card p-8 text-center text-sm text-ink-500">Aún no hay publicaciones. ¡Sé el primero!</p>
            ) : (
              <div className="space-y-4">
                {posts.map((p) => <PostCard key={p.id} post={p} author={p.author} />)}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          {/* Featured guilds */}
          <div className="card-medieval p-4">
            <SectionTitle title={t('section.featured')} action={{ to: '/gremios', label: t('common.search') }} />
            {!guilds ? <Spinner /> : guilds.length === 0 ? (
              <p className="text-sm text-ink-500">{t('guilds.empty')}</p>
            ) : (
              <div className="space-y-3">
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
              <div className="space-y-3">
                {news.map((n) => (
                  <Link key={n.id} to={`/publicacion/${n.id}`} className="block rounded-xl p-2 hover:bg-ink-100 dark:hover:bg-ink-800">
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
              <div className="space-y-2.5">
                {events.map((ev) => {
                  const t = EVENT_TYPES.find((x) => x.key === ev.type);
                  return (
                    <Link key={ev.id} to={`/eventos`} className="block rounded-xl p-2.5 hover:bg-ink-100 dark:hover:bg-ink-800">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${t?.color ?? 'bg-gold-500'}`} />
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
                {images.slice(0, 9).map((url, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                    <img src={url} alt="" className="h-full w-full object-cover transition hover:scale-105" />
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
                {videos.slice(0, 4).map((url, i) => (
                  <video key={i} src={url} controls className="w-full rounded-lg bg-black" />
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="card-medieval p-4">
            <div className="grid grid-cols-2 gap-2">
              <QuickLink to="/ranking" icon={Trophy} label={t('quick.rankings')} />
              <QuickLink to="/alianzas" icon={Shield} label={t('quick.alliances')} />
              <QuickLink to="/eventos" icon={Calendar} label={t('quick.events')} />
              <QuickLink to="/buscar" icon={Users} label={t('quick.search')} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof Trophy; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition hover:bg-gold-50 hover:shadow-sm dark:hover:bg-gold-950/30">
      <Icon className="h-5 w-5 text-gold-500 transition-transform hover:scale-110" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

function ImperioSection({ to, icon: Icon, title, desc, accent }: { to: string; icon: typeof Trophy; title: string; desc: string; accent: string }) {
  return (
    <Link to={to} className="card-medieval card-hover relative overflow-hidden p-4">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-50`} />
      <div className="relative">
        <Icon className="h-6 w-6 text-gold-500" />
        <p className="mt-2 font-display text-sm font-semibold text-ink-900 dark:text-white">{title}</p>
        <p className="text-xs text-ink-500">{desc}</p>
      </div>
    </Link>
  );
}
