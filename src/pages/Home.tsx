import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Newspaper, Video, ImageIcon, Sparkles, Users, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { GuildCard } from '../components/GuildCard';
import { SectionTitle, Spinner } from '../components/ui';
import { EVENT_TYPES, type Guild, type Post, type Profile, type AlbionEvent } from '../lib/types';
import { formatDateTime } from '../lib/format';

type PostWithAuthor = Post & { author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> };

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithAuthor[] | null>(null);
  const [guilds, setGuilds] = useState<Guild[] | null>(null);
  const [news, setNews] = useState<PostWithAuthor[] | null>(null);
  const [events, setEvents] = useState<AlbionEvent[] | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: postData }, { data: guildData }, { data: newsData }, { data: eventData }] = await Promise.all([
        supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url)').order('created_at', { ascending: false }).limit(10),
        supabase.from('guilds').select('*').eq('is_featured', true).limit(4),
        supabase.from('posts').select('*, author:profiles(id, username, display_name, avatar_url)').eq('is_news', true).order('created_at', { ascending: false }).limit(3),
        supabase.from('events').select('*').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
      ]);
      setPosts(postData as PostWithAuthor[] ?? []);
      setGuilds(guildData ?? []);
      setNews(newsData as PostWithAuthor[] ?? []);
      setEvents(eventData ?? []);

      const [{ data: imgData }, { data: vidData }] = await Promise.all([
        supabase.from('posts').select('media_urls').eq('type', 'image').order('created_at', { ascending: false }).limit(8),
        supabase.from('posts').select('media_urls').eq('type', 'video').order('created_at', { ascending: false }).limit(6),
      ]);
      setImages((imgData ?? []).flatMap((p: any) => p.media_urls ?? []));
      setVideos((vidData ?? []).flatMap((p: any) => p.media_urls ?? []));
    })();
  }, []);

  return (
    <div className="container-app py-6">
      {/* Hero */}
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-950 to-ink-900 p-8 sm:p-12">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(196,144,42,0.5), transparent 40%), radial-gradient(circle at 85% 80%, rgba(196,144,42,0.35), transparent 45%)' }} />
        <div className="relative max-w-2xl">
          <span className="chip bg-gold-500/15 text-gold-300 backdrop-blur"><Sparkles className="h-3.5 w-3.5" /> Red social de gremios</span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
            Tu gremio. Tu alianza. <span className="text-gold-400">Tu Imperio.</span>
          </h1>
          <p className="mt-3 text-base text-ink-200 sm:text-lg">
            Conecta con la comunidad hispanohablante de Albion Online. Recluta, organiza eventos, publica tus hazañas y domina Avalon.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/registro" className="btn-primary">Crear cuenta</Link>
            <Link to="/gremios" className="btn-outline border-gold-400/40 text-white hover:bg-white/10">Explorar gremios</Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <CreatePost onCreated={() => window.location.reload()} />
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
          <div className="card p-4">
            <SectionTitle title="Gremios destacados" action={{ to: '/gremios', label: 'Ver todos' }} />
            {!guilds ? <Spinner /> : guilds.length === 0 ? (
              <p className="text-sm text-ink-500">No hay gremios destacados aún.</p>
            ) : (
              <div className="space-y-3">
                {guilds.map((g) => (
                  <Link key={g.id} to={`/gremio/${g.slug}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-ink-100 dark:hover:bg-ink-800">
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
          <div className="card p-4">
            <div className="grid grid-cols-2 gap-2">
              <QuickLink to="/ranking" icon={Trophy} label="Rankings" />
              <QuickLink to="/alianzas" icon={Shield} label="Alianzas" />
              <QuickLink to="/eventos" icon={Calendar} label="Eventos" />
              <QuickLink to="/buscar" icon={Users} label="Buscar" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof Trophy; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition hover:bg-ink-100 dark:hover:bg-ink-800">
      <Icon className="h-5 w-5 text-gold-500" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
