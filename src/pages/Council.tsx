import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, Plus, ChevronUp, X, Image as ImageIcon, Filter, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { useRealtime, upsertById, removeById } from '../lib/useRealtime';
import { AvatarWithFrame } from '../components/AvatarWithFrame';
import { RankBadge } from '../components/RankBadge';
import { Spinner, EmptyState } from '../components/ui';
import { awardReputation } from '../lib/economy';
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_STATUSES,
  type Suggestion,
  type SuggestionCategory,
  type SuggestionStatus,
  type Profile,
  type MedievalRank,
  type FrameRarity,
} from '../lib/types';

type SuggestionWithAuthor = Suggestion & {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank'> & {
    frame?: { rarity: FrameRarity; icon: string | null } | null;
  };
};

const CATEGORY_FILTERS: { key: SuggestionCategory | 'todas'; label: string; emoji: string }[] = [
  { key: 'todas', label: 'Todas', emoji: '📜' },
  ...SUGGESTION_CATEGORIES,
];

const STATUS_FILTERS: { key: SuggestionStatus | 'todos'; label: string; emoji: string }[] = [
  { key: 'todos', label: 'Todos', emoji: '📋' },
  ...SUGGESTION_STATUSES.map((s) => ({ key: s.key, label: s.label, emoji: s.emoji })),
];

export default function CouncilPage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const [suggestions, setSuggestions] = useState<SuggestionWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'votos' | 'recientes'>('votos');
  const [categoryFilter, setCategoryFilter] = useState<SuggestionCategory | 'todas'>('todas');
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'todos'>('todos');
  const [showForm, setShowForm] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('nueva_funcion');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: sugs }, { data: votes }] = await Promise.all([
      supabase
        .from('suggestions')
        .select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon)))')
        .order('vote_count', { ascending: false }),
      profile?.id
        ? supabase.from('suggestion_votes').select('suggestion_id').eq('user_id', profile.id)
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (sugs) setSuggestions(sugs as unknown as SuggestionWithAuthor[]);
    if (votes) setMyVotes(new Set(votes.map((v: any) => v.suggestion_id)));
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime<Suggestion>({
    table: 'suggestions',
    onEvent: ({ eventType, new: row, old: oldRow }) => {
      if (eventType === 'DELETE' || !row) {
        if (oldRow) setSuggestions((prev) => removeById(prev, oldRow.id));
        return;
      }
      supabase
        .from('suggestions')
        .select('*, author:profiles(id, username, display_name, avatar_url, medieval_rank, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon)))')
        .eq('id', row.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setSuggestions((prev) => upsertById(prev, data as unknown as SuggestionWithAuthor));
        });
    },
  });

  const filtered = useMemo(() => {
    let list = suggestions;
    if (categoryFilter !== 'todas') list = list.filter((s) => s.category === categoryFilter);
    if (statusFilter !== 'todos') list = list.filter((s) => s.status === statusFilter);
    if (sortBy === 'votos') {
      list = [...list].sort((a, b) => b.vote_count - a.vote_count);
    } else {
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [suggestions, categoryFilter, statusFilter, sortBy]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setCategory('nueva_funcion');
    setImageUrl('');
    setShowForm(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!title.trim() || !description.trim()) {
      push({ type: 'error', message: 'Título y descripción son obligatorios' });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from('suggestions').insert({
      author_id: profile.id,
      title: title.trim(),
      description: description.trim(),
      category,
      image_url: imageUrl.trim() || null,
    }).select('id').single();
    if (error) {
      push({ type: 'error', message: error.message });
    } else {
      await awardReputation(profile.id, 'create_suggestion', 'suggestion', data.id);
      push({ type: 'success', message: 'Sugerencia enviada al Consejo del Reino' });
      resetForm();
    }
    setSubmitting(false);
  }

  async function toggleVote(suggestionId: string, authorId: string) {
    if (!profile) {
      push({ type: 'error', message: 'Inicia sesión para votar' });
      return;
    }
    setVoting(suggestionId);
    const hasVoted = myVotes.has(suggestionId);
    if (hasVoted) {
      const { error } = await supabase.from('suggestion_votes').delete().eq('suggestion_id', suggestionId).eq('user_id', profile.id);
      if (!error) {
        setMyVotes((prev) => { const next = new Set(prev); next.delete(suggestionId); return next; });
        await supabase.from('suggestions').update({ vote_count: Math.max(0, (suggestions.find((s) => s.id === suggestionId)?.vote_count ?? 1) - 1) }).eq('id', suggestionId);
      }
    } else {
      const { error } = await supabase.from('suggestion_votes').insert({ suggestion_id: suggestionId, user_id: profile.id });
      if (!error) {
        setMyVotes((prev) => new Set(prev).add(suggestionId));
        await supabase.from('suggestions').update({ vote_count: (suggestions.find((s) => s.id === suggestionId)?.vote_count ?? 0) + 1 }).eq('id', suggestionId);
        if (authorId !== profile.id) {
          await awardReputation(authorId, 'suggestion_vote', 'suggestion', suggestionId);
        }
      }
    }
    setVoting(null);
  }

  return (
    <div className="container-app py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-gold-100 to-gold-50 p-3 dark:from-gold-950/50 dark:to-ink-900">
            <Lightbulb className="h-6 w-6 text-gold-600 dark:text-gold-400" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Consejo del Reino</h1>
            <p className="text-sm text-ink-500">Comparte tus ideas y vota las propuestas de la comunidad</p>
          </div>
        </div>
        {profile && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nueva idea</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-semibold text-ink-500">
            <Filter className="h-3.5 w-3.5" /> Categoría:
          </span>
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(c.key)}
              className={`chip transition ${categoryFilter === c.key ? 'bg-gold-500 text-ink-950 shadow-sm' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'}`}
            >
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-semibold text-ink-500">Estado:</span>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`chip transition ${statusFilter === s.key ? 'bg-gold-500 text-ink-950 shadow-sm' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'}`}
            >
              <span>{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy('votos')}
            className={`chip transition ${sortBy === 'votos' ? 'bg-gold-500 text-ink-950' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Más votadas
          </button>
          <button
            onClick={() => setSortBy('recientes')}
            className={`chip transition ${sortBy === 'recientes' ? 'bg-gold-500 text-ink-950' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
          >
            <Clock className="h-3.5 w-3.5" /> Recientes
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <Spinner className="py-20" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No hay sugerencias" hint="Sé el primero en proponer una idea para el reino." action={profile ? { to: '#', label: 'Crear idea' } : undefined} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => {
            const catMeta = SUGGESTION_CATEGORIES.find((c) => c.key === s.category);
            const statusMeta = SUGGESTION_STATUSES.find((st) => st.key === s.status);
            const hasVoted = myVotes.has(s.id);
            return (
              <div key={s.id} className="card-medieval card-hover fade-in-up flex flex-col p-4" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    {catMeta?.emoji} {catMeta?.label}
                  </span>
                  <span className={`chip ${statusMeta?.color}`}>
                    {statusMeta?.emoji} {statusMeta?.label}
                  </span>
                </div>
                <h3 className="mt-2.5 font-display font-semibold leading-snug text-ink-900 dark:text-white">{s.title}</h3>
                <p className="mt-1 line-clamp-3 flex-1 text-sm text-ink-500 dark:text-ink-400">{s.description}</p>
                {s.image_url && (
                  <div className="mt-2 overflow-hidden rounded-lg">
                    <img src={s.image_url} alt="" className="h-32 w-full object-cover" />
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <Link to={`/perfil/${s.author.username}`} className="flex items-center gap-2">
                    <AvatarWithFrame
                      src={s.author?.avatar_url}
                      alt={s.author?.username ?? ''}
                      size="xs"
                      frameRarity={(s.author as any)?.frame?.rarity ?? null}
                      frameIcon={(s.author as any)?.frame?.icon ?? null}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{s.author?.display_name || s.author?.username}</p>
                      {s.author?.medieval_rank && <RankBadge rank={s.author.medieval_rank as MedievalRank} size="xs" showEmoji={false} />}
                    </div>
                  </Link>
                  <button
                    onClick={() => toggleVote(s.id, s.author_id)}
                    disabled={voting === s.id}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition ${hasVoted ? 'bg-gold-500 text-ink-950 shadow-sm' : 'bg-ink-100 text-ink-600 hover:bg-gold-100 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-gold-950/40'}`}
                  >
                    {hasVoted ? <ChevronUp className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    {s.vote_count}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="card-medieval w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Nueva propuesta al Consejo</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Resume tu idea en pocas palabras..."
                  maxLength={120}
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTION_CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      className={`chip transition ${category === c.key ? 'bg-gold-500 text-ink-950 shadow-sm' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300'}`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explica tu idea en detalle..."
                  rows={4}
                  maxLength={1000}
                  className="input resize-none"
                />
              </div>
              <div>
                <label className="label flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> URL de imagen (opcional)</label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Enviando...' : 'Enviar propuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
