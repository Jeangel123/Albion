import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, X, Loader2, Trash2, Image as ImageIcon, Video as VideoIcon, Eye } from 'lucide-react';
import { supabase, STORAGE_BUCKET } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from './Toast';
import { Avatar } from './Avatar';
import { useRealtime, upsertById, removeById } from '../lib/useRealtime';
import { useI18n } from '../lib/i18n';
import type { Story, StoryWithAuthor, StoryMediaType } from '../lib/types';


const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

export function Stories() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const { push } = useToast();
  const [stories, setStories] = useState<StoryWithAuthor[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<StoryWithAuthor | null>(null);
  const fileImgRef = useRef<HTMLInputElement>(null);
  const fileVidRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank), community:communities(id, name, slug, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('[stories] load:', error.message);
        setStories([]);
        return;
      }
      setStories(data as StoryWithAuthor[] ?? []);
    })();
  }, []);

  const handleStoryEvent = useCallback(({ eventType, new: row, old: oldRow }: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => {
    if (eventType === 'DELETE' && oldRow?.id) {
      setStories((list) => (list ? removeById(list, oldRow.id) : list));
      return;
    }
    if (row?.id && row.expires_at && new Date(row.expires_at) > new Date()) {
      supabase
        .from('stories')
        .select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank), community:communities(id, name, slug, avatar_url)')
        .eq('id', row.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setStories((list) => list ? upsertById(list, data as StoryWithAuthor) : [data as StoryWithAuthor]);
        });
    }
  }, []);
  useRealtime<Story>({ table: 'stories', onEvent: handleStoryEvent });

  async function handleFile(file: File, type: StoryMediaType) {
    if (!profile) return;
    const maxBytes = type === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (type === 'image' && !file.type.startsWith('image/')) {
      push({ type: 'error', message: 'El archivo debe ser una imagen' });
      return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      push({ type: 'error', message: 'El archivo debe ser un video' });
      return;
    }
    if (file.size > maxBytes) {
      push({ type: 'error', message: `El archivo no puede pesar más de ${maxBytes / 1024 / 1024}MB` });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || (type === 'image' ? 'jpg' : 'mp4');
      const path = `stories/${profile.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const { error: insErr } = await supabase
        .from('stories')
        .insert({ author_id: profile.id, media_url: data.publicUrl, media_type: type });
      if (insErr) throw insErr;
      push({ type: 'success', message: 'Historia publicada' });
    } catch (err: any) {
      push({ type: 'error', message: err?.message || 'Error al subir la historia' });
    } finally {
      setUploading(false);
      if (fileImgRef.current) fileImgRef.current.value = '';
      if (fileVidRef.current) fileVidRef.current.value = '';
    }
  }

  async function deleteStory(id: string) {
    const { error } = await supabase.from('stories').delete().eq('id', id);
    if (error) {
      push({ type: 'error', message: 'No se pudo eliminar' });
      return;
    }
    setStories((list) => (list ? removeById(list, id) : list));
    setViewing(null);
    push({ type: 'success', message: 'Historia eliminada' });
  }

  async function recordView(story: StoryWithAuthor) {
    if (!profile || profile.id === story.author_id) return;
    await supabase.from('stories').update({ view_count: story.view_count + 1 }).eq('id', story.id);
  }

  const grouped = groupStoriesByAuthor(stories ?? []);

  return (
    <>
      <section className="mb-4">
        <div className="card p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-500">
              {t('stories.title')}
            </h2>
            {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-500" />}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-thin">
            {profile && (
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <button
                  onClick={() => fileImgRef.current?.click()}
                  disabled={uploading}
                  className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-gold-400 bg-gold-50 transition hover:bg-gold-100 disabled:opacity-50 dark:bg-gold-950/30 dark:hover:bg-gold-950/50"
                  title={t('stories.add')}
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin text-gold-500" /> : <Plus className="h-5 w-5 text-gold-500" />}
                </button>
                <span className="text-[10px] font-medium text-ink-600 dark:text-ink-300">{t('stories.yourStory')}</span>
              </div>
            )}
            {stories === null ? (
              <div className="flex items-center gap-2 text-xs text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin" /> ...
              </div>
            ) : grouped.length === 0 && !profile ? (
              <p className="flex items-center text-xs text-ink-400">{t('stories.empty')}</p>
            ) : (
              grouped.map((group) => (
                <button
                  key={group.authorId}
                  onClick={() => setViewing(group.stories[0])}
                  className="group flex shrink-0 flex-col items-center gap-1.5"
                >
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-tr from-gold-400 via-gold-500 to-gold-600 p-0.5 transition group-hover:scale-105">
                    <div className="h-full w-full rounded-full bg-white p-0.5 dark:bg-ink-900">
                      {group.stories[0].author?.avatar_url ? (
                        <img src={group.stories[0].author.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-ink-100 font-display font-bold text-gold-500 dark:bg-ink-800">
                          {(group.stories[0].author?.display_name || group.stories[0].author?.username || '?')[0]}
                        </div>
                      )}
                    </div>
                    {group.stories[0].media_type === 'video' && (
                      <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 ring-2 ring-white dark:ring-ink-900">
                        <VideoIcon className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="max-w-[64px] truncate text-[10px] font-medium text-ink-600 dark:text-ink-300">
                    {group.isCommunity ? group.communityName : group.stories[0].author?.display_name || group.stories[0].author?.username || 'Usuario'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {profile && (
        <>
          <input
            ref={fileImgRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, 'image'); }}
          />
          <input
            ref={fileVidRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, 'video'); }}
          />
        </>
      )}

      {viewing && (
        <StoryViewer
          story={viewing}
          isOwner={profile?.id === viewing.author_id}
          onClose={() => setViewing(null)}
          onDelete={() => deleteStory(viewing.id)}
          onView={() => recordView(viewing)}
        />
      )}
    </>
  );
}

function groupStoriesByAuthor(stories: StoryWithAuthor[]): {
  authorId: string;
  isCommunity: boolean;
  communityName?: string;
  stories: StoryWithAuthor[];
}[] {
  const groups = new Map<string, { authorId: string; isCommunity: boolean; communityName?: string; stories: StoryWithAuthor[] }>();
  for (const s of stories) {
    const key = s.community_id || s.author_id;
    const existing = groups.get(key);
    if (existing) {
      existing.stories.push(s);
    } else {
      groups.set(key, {
        authorId: s.author_id,
        isCommunity: !!s.community_id,
        communityName: s.community?.name,
        stories: [s],
      });
    }
  }
  return Array.from(groups.values());
}

function StoryViewer({ story, isOwner, onClose, onDelete, onView }: {
  story: StoryWithAuthor;
  isOwner: boolean;
  onClose: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const { t } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    onView();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in" onClick={onClose}>
      <div className="relative mx-auto max-h-[90vh] max-w-md overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {story.media_type === 'video' ? (
          <video src={story.media_url} controls autoPlay className="max-h-[85vh] w-full object-contain" />
        ) : (
          <img src={story.media_url} alt={story.caption ?? ''} className="max-h-[85vh] w-full object-contain" />
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3">
          <div className="flex items-center gap-2">
            <Avatar src={story.author?.avatar_url} alt={story.author?.username ?? ''} size="sm" to={story.author?.username ? `/perfil/${story.author.username}` : undefined} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{story.author?.display_name || story.author?.username || 'Usuario'}</p>
              {story.community && <p className="truncate text-[10px] text-gold-300">{t('stories.community')}: {story.community.name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg bg-white/10 p-1.5 text-white transition hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
        {story.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-sm text-white">{story.caption}</p>
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white">
            <Eye className="h-3 w-3" /> {story.view_count} {t('stories.views')}
          </span>
          {isOwner && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 rounded-full bg-red-500/80 px-2 py-1 text-[10px] text-white transition hover:bg-red-500"
            >
              <Trash2 className="h-3 w-3" /> {t('stories.delete')}
            </button>
          )}
        </div>
      </div>
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmDelete(false)}>
          <div className="card max-w-sm p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{t('stories.delete')}?</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="btn-outline flex-1 text-sm">Cancelar</button>
              <button onClick={onDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
