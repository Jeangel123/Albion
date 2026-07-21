import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Flag, Link as LinkIcon, Trash2, Rocket,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from './Toast';
import { Avatar } from './Avatar';
import { ReportModal } from './ReportModal';
import { timeAgo } from '../lib/format';
import { AvatarWithFrame } from './AvatarWithFrame';
import { REACTIONS, type Post, type Profile, type MedievalRank, type FrameRarity, BOOST_PRICES } from '../lib/types';
import { RankBadge } from './RankBadge';
import { boostPost } from '../lib/economy';

type PostWithAuthor = Post & { author?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank'> };

export function PostCard({ post, author, onDeleted }: { post: PostWithAuthor; author?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank'> | null; onDeleted?: (id: string) => void }) {
  const { profile } = useAuth();
  const { push } = useToast();
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [shareCount, setShareCount] = useState(post.share_count);
  const [showComments, setShowComments] = useState(false);
  const [authorFrame, setAuthorFrame] = useState<{ rarity: FrameRarity; icon: string | null } | null>(null);

  // Load the current user's existing reaction and saved state for this post
  useEffect(() => {
    if (!profile?.id) {
      setMyReaction(null);
      setSaved(false);
      return;
    }
    let active = true;
    (async () => {
      const [reactRes, saveRes, countRes] = await Promise.all([
        supabase.from('reactions').select('type').eq('post_id', post.id).eq('user_id', profile.id).maybeSingle(),
        supabase.from('saved_posts').select('id').eq('post_id', post.id).eq('user_id', profile.id).maybeSingle(),
        supabase.from('reactions').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
      ]);
      if (!active) return;
      if (reactRes.data) setMyReaction(reactRes.data.type);
      else setMyReaction(null);
      setSaved(!!saveRes.data);
      if (typeof countRes.count === 'number') setLikeCount(countRes.count);
    })();
    return () => { active = false; };
  }, [profile?.id, post.id]);

  useEffect(() => {
    if (!author?.id) return;
    let active = true;
    supabase
      .from('user_frames')
      .select('frame:avatar_frames(rarity, icon)')
      .eq('user_id', author.id)
      .eq('is_equipped', true)
      .maybeSingle()
      .then(({ data }) => { if (active && data?.frame) setAuthorFrame(data.frame as any); });
    return () => { active = false; };
  }, [author?.id]);

  const authorName = author?.display_name || author?.username || 'Usuario';
  const authorHandle = author?.username || '';
  const postUrl = `/publicacion/${post.id}`;

  async function toggleReaction(type: string) {
    if (!profile) return push({ type: 'info', message: 'Inicia sesión para reaccionar' });
    setReactionsOpen(false);
    if (myReaction === type) {
      const { error } = await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', profile.id);
      if (!error) {
        setMyReaction(null);
        setLikeCount((c) => Math.max(0, c - 1));
      }
      return;
    }
    const { error } = await supabase
      .from('reactions')
      .upsert({ post_id: post.id, user_id: profile.id, type }, { onConflict: 'post_id,user_id' });
    if (error) {
      push({ type: 'error', message: `No se pudo reaccionar: ${error.message}` });
      return;
    }
    if (myReaction && myReaction !== type) {
      setMyReaction(type);
    } else if (!myReaction) {
      setMyReaction(type);
      setLikeCount((c) => c + 1);
    }
  }
  async function toggleSave() {
    if (!profile) return push({ type: 'info', message: 'Inicia sesión para guardar' });
    if (saved) {
      await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', profile.id);
      setSaved(false);
      push({ type: 'success', message: 'Eliminado de guardados' });
    } else {
      await supabase.from('saved_posts').insert({ post_id: post.id, user_id: profile.id });
      setSaved(true);
      push({ type: 'success', message: 'Publicación guardada' });
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}${postUrl}`);
    push({ type: 'success', message: 'Enlace copiado' });
  }

  async function share() {
    if (!profile) return push({ type: 'info', message: 'Inicia sesión para compartir' });
    await supabase.from('shares').insert({ post_id: post.id, user_id: profile.id });
    setShareCount((c) => c + 1);
    copyLink();
    push({ type: 'success', message: 'Compartido' });
  }

  async function del() {
    if (!profile) return;
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (!error) {
      push({ type: 'success', message: 'Publicación eliminada' });
      onDeleted?.(post.id);
    }
  }

  const isOwner = profile?.id === post.author_id;
  const isBoosted = post.is_boosted && post.boosted_until && new Date(post.boosted_until) > new Date();
  const [boosting, setBoosting] = useState(false);

  async function doBoost(hours: 24 | 72) {
    if (!profile) return;
    setBoosting(true);
    const { error } = await boostPost(profile.id, post.id, hours);
    setBoosting(false);
    if (error) push({ type: 'error', message: error });
    else push({ type: 'success', message: `Publicación destacada ${hours}h` });
  }

  return (
    <article className="card p-4 sm:p-5 animate-fade-in">
      <div className="flex items-start gap-3">
        <AvatarWithFrame src={author?.avatar_url} alt={authorName} size="md" to={authorHandle ? `/perfil/${authorHandle}` : undefined} frameRarity={authorFrame?.rarity ?? null} frameIcon={authorFrame?.icon ?? null} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to={authorHandle ? `/perfil/${authorHandle}` : '#'} className="truncate font-semibold text-ink-900 hover:text-gold-600 dark:text-white dark:hover:text-gold-400">
              {authorName}
            </Link>
            {author?.medieval_rank && <RankBadge rank={author.medieval_rank as MedievalRank} size="xs" />}
            <span className="text-xs text-ink-400">· {timeAgo(post.created_at)}</span>
            {post.is_news && <span className="chip bg-gold-100 text-gold-700 dark:bg-gold-950 dark:text-gold-300">Noticia</span>}
            {isBoosted && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Rocket className="h-3 w-3" /> Destacada</span>}
          </div>
          {post.content && <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-800 dark:text-ink-100">{post.content}</p>}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Link key={tag} to={`/buscar?q=${encodeURIComponent('#' + tag)}`} className="chip bg-gold-50 text-xs text-gold-700 hover:bg-gold-100 dark:bg-gold-950/30 dark:text-gold-300 dark:hover:bg-gold-950/50">
                  #{tag}
                </Link>
              ))}
            </div>
          )}
          {post.link_url && (
            <a href={post.link_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm link-gold">
              <LinkIcon className="h-4 w-4" /> {post.link_url}
            </a>
          )}
          {post.media_urls?.length > 0 && (
            <div className={`mt-3 grid gap-2 ${post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {post.media_urls.map((url, i) => (
                post.type === 'video' ? (
                  <video key={i} src={url} controls className="max-h-96 w-full rounded-xl bg-black" />
                ) : (
                  <img key={i} src={url} alt="" className="max-h-96 w-full rounded-xl object-cover" />
                )
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen((p) => !p)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-48 card p-1.5 animate-slide-up">
                <button onClick={() => { toggleSave(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800">
                  <Bookmark className="h-4 w-4" /> {saved ? 'Quitar de guardados' : 'Guardar'}
                </button>
                <button onClick={() => { copyLink(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800">
                  <LinkIcon className="h-4 w-4" /> Copiar enlace
                </button>
                <button onClick={() => { setReportOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800">
                  <Flag className="h-4 w-4" /> Reportar
                </button>
                {isOwner && (
                  <button onClick={() => { del(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </button>
                )}
                {isOwner && !isBoosted && (
                  <button onClick={() => { doBoost(24); setMenuOpen(false); }} disabled={boosting} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40">
                    <Rocket className="h-4 w-4" /> Destacar (24h · {BOOST_PRICES.post_24h} silver)
                  </button>
                )}
                {isOwner && !isBoosted && (
                  <button onClick={() => { doBoost(72); setMenuOpen(false); }} disabled={boosting} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40">
                    <Rocket className="h-4 w-4" /> Destacar (72h · {BOOST_PRICES.post_72h} silver)
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 border-t border-ink-100 pt-3 dark:border-ink-800">
        <div className="relative">
          <button
            onClick={() => profile && setReactionsOpen((p) => !p)}
            className={`btn-ghost px-2.5 ${myReaction ? 'text-gold-600 dark:text-gold-400' : ''}`}
          >
            <Heart className={`h-4.5 w-4.5 ${myReaction ? 'fill-gold-500 text-gold-500' : ''}`} />
            <span className="text-xs">{likeCount}</span>
          </button>
          {reactionsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setReactionsOpen(false)} />
              <div className="absolute bottom-10 left-0 z-20 flex gap-1 card p-1.5 animate-slide-up">
                {REACTIONS.map((r) => (
                  <button key={r.key} onClick={() => toggleReaction(r.key)} className="rounded-lg p-1.5 text-xl hover:bg-ink-100 dark:hover:bg-ink-800" title={r.label}>
                    {r.emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={() => setShowComments((p) => !p)} className="btn-ghost px-2.5">
          <MessageCircle className="h-4.5 w-4.5" />
          <span className="text-xs">{post.comment_count}</span>
        </button>
        <button onClick={share} className="btn-ghost px-2.5">
          <Share2 className="h-4.5 w-4.5" />
          <span className="text-xs">{shareCount}</span>
        </button>
        <button onClick={toggleSave} className="btn-ghost ml-auto px-2.5">
          <Bookmark className={`h-4.5 w-4.5 ${saved ? 'fill-gold-500 text-gold-500' : ''}`} />
        </button>
      </div>

      {showComments && <CommentSection postId={post.id} />}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="post" targetId={post.id} />
    </article>
  );
}

function CommentSection({ postId }: { postId: string }) {
  const { profile } = useAuth();
  const { push } = useToast();
  const [comments, setComments] = useState<any[] | null>(null);
  const [text, setText] = useState('');

  async function load() {
    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, author:profiles(username, display_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    setComments(data ?? []);
  }

  if (comments === null) {
    load();
    return <div className="mt-3 text-sm text-ink-400">Cargando comentarios...</div>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return push({ type: 'info', message: 'Inicia sesión para comentar' });
    if (!text.trim()) return;
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: profile.id, content: text.trim() })
      .select('id, content, created_at, author:profiles(username, display_name, avatar_url)')
      .single();
    if (error) {
      push({ type: 'error', message: `No se pudo comentar: ${error.message}` });
      return;
    }
    if (data) {
      setComments((c) => [data, ...(c ?? [])]);
      setText('');
      await supabase.from('posts').update({ comment_count: (comments?.length ?? 0) + 1 }).eq('id', postId);
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-ink-100 pt-3 dark:border-ink-800">
      <form onSubmit={submit} className="flex gap-2">
        <Avatar src={profile?.avatar_url} alt={profile?.username ?? ''} size="xs" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe un comentario..." className="input py-2" />
        <button className="btn-primary px-3">Enviar</button>
      </form>
      {comments.length === 0 ? (
        <p className="text-sm text-ink-400">Sé el primero en comentar.</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar src={c.author?.avatar_url} alt={c.author?.display_name || c.author?.username || ''} size="xs" to={c.author?.username ? `/perfil/${c.author.username}` : undefined} />
            <div className="rounded-xl bg-ink-100 px-3 py-2 dark:bg-ink-800">
              <p className="text-xs font-semibold">{c.author?.display_name || c.author?.username}</p>
              <p className="text-sm text-ink-700 dark:text-ink-200">{c.content}</p>
              <p className="mt-0.5 text-xs text-ink-400">{timeAgo(c.created_at)}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
