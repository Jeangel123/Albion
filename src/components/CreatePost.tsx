import { useState } from 'react';
import { Image as ImageIcon, Video, Link as LinkIcon, BarChart3, Send, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from './Toast';
import { Avatar } from './Avatar';
import { ImageUpload } from './ImageUpload';
import type { PostType } from '../lib/types';

export function CreatePost({ onCreated, guildId }: { onCreated?: () => void; guildId?: string }) {
  const { profile } = useAuth();
  const { push } = useToast();
  const [content, setContent] = useState('');
  const [type, setType] = useState<PostType>('text');
  const [linkUrl, setLinkUrl] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [submitting, setSubmitting] = useState(false);

  if (!profile) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && type === 'text') return push({ type: 'error', message: 'Escribe algo' });
    setSubmitting(true);

    const media = mediaUrl ? [mediaUrl] : [];
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: profile!.id,
        guild_id: guildId ?? null,
        type,
        content: content.trim() || null,
        media_urls: media,
        link_url: type === 'link' ? linkUrl || null : null,
      })
      .select('id')
      .single();

    if (error) {
      setSubmitting(false);
      return push({ type: 'error', message: 'No se pudo publicar' });
    }

    if (type === 'poll' && data) {
      const opts = pollOptions.filter((o) => o.trim()).map((label, i) => ({ post_id: data.id, label, position: i }));
      if (opts.length >= 2) await supabase.from('poll_options').insert(opts);
    }

    setContent('');
    setLinkUrl('');
    setMediaUrl('');
    setPollOptions(['', '']);
    setType('text');
    setSubmitting(false);
    push({ type: 'success', message: 'Publicado' });
    onCreated?.();
  }

  return (
    <form onSubmit={submit} className="card p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar src={profile.avatar_url} alt={profile.username} size="md" />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="¿Qué estás haciendo en Albion?"
            rows={3}
            className="input resize-none"
          />
          {type === 'link' && (
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="input mt-2" />
          )}
          {(type === 'image' || type === 'video') && (
            <div className="mt-2">
              <ImageUpload
                label={type === 'image' ? 'Imagen' : 'Miniatura del video'}
                variant="banner"
                folder="posts"
                ownerId={profile.id}
                value={mediaUrl || null}
                onChange={(url) => setMediaUrl(url ?? '')}
              />
            </div>
          )}
          {type === 'poll' && (
            <div className="mt-2 space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={(e) => setPollOptions((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={`Opción ${i + 1}`}
                    className="input"
                  />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => setPollOptions((p) => p.filter((_, j) => j !== i))} className="btn-ghost px-2">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button type="button" onClick={() => setPollOptions((p) => [...p, ''])} className="text-sm link-gold">+ Añadir opción</button>
              )}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1">
              <TypeBtn active={type === 'text'} onClick={() => setType('text')} label="Texto" />
              <TypeBtn active={type === 'image'} onClick={() => setType('image')} icon={ImageIcon} />
              <TypeBtn active={type === 'video'} onClick={() => setType('video')} icon={Video} />
              <TypeBtn active={type === 'link'} onClick={() => setType('link')} icon={LinkIcon} />
              <TypeBtn active={type === 'poll'} onClick={() => setType('poll')} icon={BarChart3} />
            </div>
            <button disabled={submitting} className="btn-primary">
              <Send className="h-4 w-4" /> Publicar
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function TypeBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon?: typeof Video; label?: string }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg p-2 transition ${active ? 'bg-gold-100 text-gold-700 dark:bg-gold-950 dark:text-gold-300' : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800'}`}>
      {Icon ? <Icon className="h-4.5 w-4.5" /> : <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}
