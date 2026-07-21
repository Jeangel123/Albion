import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Trash2, Reply, Smile, Image as ImageIcon, X, MessageCircle, Check, CheckCheck } from 'lucide-react';
import { isSameDay, format, isToday, isYesterday } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { useRealtime, upsertById, removeById } from '../lib/useRealtime';
import { Avatar } from './Avatar';
import { AvatarWithFrame } from './AvatarWithFrame';
import { RankBadge } from './RankBadge';
import { FounderName, isFounderRole } from './FounderStyle';
import { ImageUpload } from './ImageUpload';
import { REACTIONS, type Message, type MessageReaction, type Profile, type MedievalRank, type FrameRarity, type ReactionType } from '../lib/types';

export type ChatMessage = Message & {
  sender: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank' | 'role'> & {
    frame?: { rarity: FrameRarity; icon: string | null } | null;
  } | null;
  reactions?: MessageReaction[];
  reply_to_message?: ChatMessage | null;
};

export type ChatScope =
  | { kind: 'guild'; id: string }
  | { kind: 'room'; id: string };

type ChatPanelProps = {
  scope: ChatScope;
  currentUserId: string;
  canModerate: boolean;
  useFrames?: boolean;
  storageFolder: string;
};

function dateLabel(d: Date): string {
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: undefined });
}

export function ChatPanel({ scope, currentUserId, canModerate, useFrames = false, storageFolder }: ChatPanelProps) {
  const { push } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const filterCol = scope.kind === 'guild' ? 'guild_id' : 'room_id';
  const filter = `${filterCol}=eq.${scope.id}`;

  const [loadError, setLoadError] = useState(false);

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon)))')
      .eq(filterCol, scope.id)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) {
      console.error('[chat] load:', error.message);
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);
    const msgs = (data ?? []) as unknown as ChatMessage[];
    const ids = msgs.map((m) => m.id);
    let reactionsMap: Record<string, MessageReaction[]> = {};
    if (ids.length > 0) {
      const { data: reacts } = await supabase.from('message_reactions').select('*').in('message_id', ids);
      (reacts ?? []).forEach((r: MessageReaction) => {
        if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
        reactionsMap[r.message_id].push(r);
      });
    }
    setMessages(msgs.map((m) => ({ ...m, reactions: reactionsMap[m.id] ?? [] })));
    // Seed read ids with own messages
    setReadIds(new Set(msgs.filter((m) => m.sender_id === currentUserId).map((m) => m.id)));
    setLoading(false);
  }, [scope.id, filterCol, currentUserId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const markRead = useCallback(async () => {
    if (!currentUserId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    const readData = {
      user_id: currentUserId,
      [filterCol]: scope.id,
      last_read_message_id: lastMsg.id,
      last_read_at: new Date().toISOString(),
    };
    const onConflict = scope.kind === 'room' ? 'user_id,room_id' : 'user_id,guild_id';
    await supabase.from('message_reads').upsert(readData, { onConflict });
    // Mark visible others' messages as read when at bottom
    if (atBottom) {
      setReadIds((prev) => {
        const next = new Set(prev);
        messages.forEach((m) => { if (m.sender_id !== currentUserId) next.add(m.id); });
        return next;
      });
    }
  }, [currentUserId, messages, scope.id, filterCol, scope.kind, atBottom]);

  useEffect(() => { markRead(); }, [markRead]);

  const handleMessageEvent = useCallback(({ eventType, new: row, old: oldRow }: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => {
    if (eventType === 'DELETE' && oldRow?.id) {
      setMessages((list) => removeById(list, oldRow.id));
    } else if (row?.id) {
      supabase
        .from('messages')
        .select('*, sender:profiles(id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon)))')
        .eq('id', row.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          supabase.from('message_reactions').select('*').eq('message_id', row.id).then(({ data: reacts }) => {
            setMessages((list) => upsertById(list, { ...(data as ChatMessage), reactions: reacts ?? [] }));
          });
        });
    }
  }, []);

  useRealtime<Message>({ table: 'messages', filter, onEvent: handleMessageEvent });

  const handleReactionEvent = useCallback(({ eventType, new: row, old: oldRow }: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => {
    if (eventType === 'DELETE' && oldRow?.id) {
      setMessages((list) => list.map((m) => ({
        ...m,
        reactions: (m.reactions ?? []).filter((r) => r.id !== oldRow.id),
      })));
    } else if (row?.id) {
      setMessages((list) => list.map((m) => {
        if (m.id !== row.message_id) return m;
        const exists = (m.reactions ?? []).some((r) => r.id === row.id);
        const updated: MessageReaction = row;
        return { ...m, reactions: exists ? (m.reactions ?? []).map((r) => (r.id === row.id ? updated : r)) : [...(m.reactions ?? []), updated] };
      }));
    }
  }, []);
  useRealtime<MessageReaction>({ table: 'message_reactions', onEvent: handleReactionEvent });

  useEffect(() => {
    if (atBottom) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, atBottom]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(nearBottom);
  }

  async function sendMessage() {
    const content = input.trim();
    if ((!content && !pendingImage) || sending) return;
    setSending(true);
    try {
      const payload: Record<string, any> = {
        sender_id: currentUserId,
        content: content || null,
        [filterCol]: scope.id,
        message_type: pendingImage ? 'image' : 'text',
        media_url: pendingImage,
      };
      if (replyTo) payload.reply_to = replyTo.id;
      const { data: inserted, error } = await supabase.from('messages').insert(payload).select('id').single();
      if (error) {
        console.error('[chat] send:', error);
        push({ type: 'error', message: `No se pudo enviar: ${error.message}` });
        return;
      }
      if (inserted) {
        supabase
          .from('messages')
          .select('*, sender:profiles(id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon)))')
          .eq('id', inserted.id)
          .maybeSingle()
          .then(({ data: full }) => {
            if (full) setMessages((list) => upsertById(list, full as ChatMessage));
          });
      }
      setInput('');
      setPendingImage(null);
      setReplyTo(null);
      setAtBottom(true);
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(messageId: string) {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) push({ type: 'error', message: `No se pudo eliminar: ${error.message}` });
  }

  async function toggleReaction(messageId: string, type: ReactionType) {
    const existing = messages.find((m) => m.id === messageId)?.reactions?.find((r) => r.user_id === currentUserId && r.type === type);
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else {
      const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: currentUserId, type });
      if (error) push({ type: 'error', message: `No se pudo reaccionar: ${error.message}` });
    }
    setReactingTo(null);
  }

  function startReply(msg: ChatMessage) {
    setReplyTo(msg);
    (document.getElementById('chat-input') as HTMLInputElement)?.focus();
  }

  const scopeLabel = scope.kind === 'guild' ? 'gremio' : 'comunidad';

  // Group messages by day for date separators
  let lastDate: Date | null = null;

  return (
    <div className="card flex h-[60vh] flex-col p-0 sm:h-[70vh]">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center justify-between gap-2 border-b border-gold-200/40 bg-gold-50/60 px-3 py-2 dark:border-gold-900/30 dark:bg-gold-950/20">
          <div className="flex min-w-0 items-center gap-2 text-xs text-ink-600 dark:text-ink-300">
            <Reply className="h-3.5 w-3.5 shrink-0 text-gold-500" />
            <div className="min-w-0">
              <p className="font-semibold text-gold-600 dark:text-gold-400">{replyTo.sender?.display_name || replyTo.sender?.username || 'usuario'}</p>
              <p className="truncate text-ink-500 dark:text-ink-400">{(replyTo.content || '[imagen]').slice(0, 60)}</p>
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600 dark:hover:bg-ink-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-ink-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-300 border-t-gold-600" />
            <p>Cargando mensajes...</p>
          </div>
        ) : loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-ink-400">
            <div className="rounded-2xl bg-rose-100 p-3 dark:bg-rose-950/40">
              <MessageCircle className="h-7 w-7 text-rose-500" />
            </div>
            <p>No se pudieron cargar los mensajes.</p>
            <button onClick={() => { setLoading(true); loadMessages(); }} className="btn-outline text-xs">Reintentar</button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center animate-fade-in">
            <div className="rounded-3xl bg-gradient-to-br from-gold-100 to-gold-50 p-5 dark:from-gold-950/40 dark:to-ink-900">
              <MessageCircle className="h-10 w-10 text-gold-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink-800 dark:text-ink-100">Aún no hay mensajes</h3>
              <p className="mt-1 max-w-xs text-sm text-ink-500 dark:text-ink-400">¡Sé el primero en escribir en este {scopeLabel}!</p>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => {
            const own = m.sender_id === currentUserId;
            const founder = isFounderRole(m.sender?.role);
            const canDelete = own || canModerate;
            const userReactions = m.reactions ?? [];
            const reactionCounts: Record<string, MessageReaction[]> = {};
            userReactions.forEach((r) => {
              if (!reactionCounts[r.type]) reactionCounts[r.type] = [];
              reactionCounts[r.type].push(r);
            });
            const msgDate = new Date(m.created_at);
            const showDateSeparator = !lastDate || !isSameDay(lastDate, msgDate);
            lastDate = msgDate;
            const isRead = own && readIds.has(m.id);
            // Group consecutive messages from same sender
            const prev = messages[idx - 1];
            const groupedWithPrev = prev && prev.sender_id === m.sender_id && !showDateSeparator && Math.abs(new Date(prev.created_at).getTime() - msgDate.getTime()) < 5 * 60 * 1000;
            return (
              <div key={m.id}>
                {showDateSeparator && (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-ink-100 px-3 py-1 text-[11px] font-medium text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                      {dateLabel(msgDate)}
                    </span>
                  </div>
                )}
                <div
                  className={`group relative flex gap-2 ${own ? 'flex-row-reverse' : ''} ${groupedWithPrev ? 'mt-0.5' : 'mt-2'}`}
                >
                  {/* Avatar spacer when grouped */}
                  <div className={`shrink-0 ${groupedWithPrev ? 'invisible' : ''}`}>
                    {useFrames ? (
                      <AvatarWithFrame
                        src={m.sender?.avatar_url}
                        alt={m.sender?.username ?? ''}
                        size="sm"
                        to={`/perfil/${m.sender?.username}`}
                        frameRarity={(m.sender as any)?.frame?.rarity ?? null}
                        frameIcon={(m.sender as any)?.frame?.icon ?? null}
                      />
                    ) : (
                      <Avatar src={m.sender?.avatar_url} alt={m.sender?.username ?? ''} size="sm" to={`/perfil/${m.sender?.username}`} />
                    )}
                  </div>
                  <div className={`max-w-[80%] sm:max-w-[70%] ${own ? 'items-end text-right' : 'items-start'} flex flex-col`}>
                    {/* Sender name (hidden when grouped) */}
                    {!groupedWithPrev && (
                      <div className={`mb-0.5 flex items-center gap-1.5 ${own ? 'justify-end' : ''}`}>
                        {founder ? (
                          <FounderName name={own ? 'Tú' : m.sender?.display_name || m.sender?.username || ''} />
                        ) : (
                          <p className="text-xs text-ink-500">{own ? 'Tú' : m.sender?.display_name || m.sender?.username}</p>
                        )}
                        {m.sender?.medieval_rank && <RankBadge rank={m.sender.medieval_rank as MedievalRank} size="xs" showEmoji={false} />}
                      </div>
                    )}
                    {/* Bubble */}
                    <div className={`relative inline-block rounded-2xl px-3 py-2 text-sm shadow-sm transition ${own ? 'rounded-tr-md' : 'rounded-tl-md'} ${founder ? 'founder-bubble text-sky-100' : own ? 'bg-blue-500 text-white' : 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100'}`}>
                      {/* Reply quote */}
                      {m.reply_to && (
                        <div className={`mb-1.5 border-l-2 pl-2 text-xs ${own ? 'border-ink-900/40 text-ink-900/70' : 'border-gold-500/60 text-ink-500 dark:text-ink-400'}`}>
                          <p className="font-semibold">{m.reply_to_message?.sender?.display_name || m.reply_to_message?.sender?.username || 'Mensaje'}</p>
                          <p className="truncate">{m.reply_to_message?.content || '[imagen]'}</p>
                        </div>
                      )}
                      {m.message_type === 'image' && m.media_url && (
                        <img src={m.media_url} alt="shared" className="mb-1 max-h-52 rounded-lg" />
                      )}
                      {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                      {/* Time + read tick inside bubble */}
                      <span className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${own ? (founder ? 'text-sky-200/70' : 'text-ink-900/60') : 'text-ink-400'}`}>
                        {format(msgDate, 'HH:mm')}
                        {own && (isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                      </span>
                      {/* WhatsApp-style quick reactions on hover/tap */}
                      <button
                        onClick={() => setReactingTo(reactingTo === m.id ? null : m.id)}
                        className={`absolute -top-3 ${own ? '-left-3' : '-right-3'} flex h-6 w-6 items-center justify-center rounded-full border border-ink-200 bg-white text-xs shadow-md transition opacity-0 group-hover:opacity-100 dark:border-ink-700 dark:bg-ink-800 ${reactingTo === m.id ? 'opacity-100' : ''}`}
                        title="Reaccionar"
                      >
                        <Smile className="h-3.5 w-3.5 text-gold-500" />
                      </button>
                    </div>
                    {/* Reaction chips — WhatsApp style, attached under bubble */}
                    {Object.keys(reactionCounts).length > 0 && (
                      <div className={`mt-0.5 flex flex-wrap gap-1 ${own ? 'justify-end' : ''}`}>
                        {Object.entries(reactionCounts).map(([type, reacts]) => {
                          const emoji = REACTIONS.find((r) => r.key === type)?.emoji ?? '?';
                          const mine = reacts.some((r) => r.user_id === currentUserId);
                          return (
                            <button
                              key={type}
                              onClick={() => toggleReaction(m.id, type as ReactionType)}
                              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs transition ${mine ? 'bg-gold-100 text-gold-700 ring-1 ring-gold-400 dark:bg-gold-900/50 dark:text-gold-300 dark:ring-gold-700' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
                            >
                              <span className="text-sm">{emoji}</span>
                              <span className="font-medium">{reacts.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Action row */}
                    <div className={`mt-0.5 flex items-center gap-1 ${own ? 'justify-end' : ''} opacity-0 transition group-hover:opacity-100`}>
                      <button onClick={() => startReply(m)} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-gold-500 dark:hover:bg-ink-800" title="Responder">
                        <Reply className="h-3 w-3" />
                      </button>
                      {canDelete && (
                        <button onClick={() => deleteMessage(m.id)} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-red-500 dark:hover:bg-ink-800" title="Eliminar">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {/* Reaction picker — WhatsApp popover */}
                    {reactingTo === m.id && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setReactingTo(null)} />
                        <div className={`absolute z-30 mt-1 flex gap-1 rounded-full border border-ink-200 bg-white px-2 py-1.5 shadow-xl animate-fade-in dark:border-ink-700 dark:bg-ink-800 ${own ? 'right-0' : 'left-0'}`}>
                          {REACTIONS.map((r) => {
                            const mine = userReactions.some((x) => x.user_id === currentUserId && x.type === r.key);
                            return (
                              <button
                                key={r.key}
                                onClick={() => toggleReaction(m.id, r.key)}
                                className={`rounded-full p-1 text-xl transition hover:scale-125 ${mine ? 'ring-2 ring-gold-400' : ''}`}
                                title={r.label}
                              >
                                {r.emoji}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {!atBottom && !loading && messages.length > 0 && (
        <button
          onClick={() => { setAtBottom(true); endRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
          className="absolute bottom-20 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition hover:bg-blue-400"
          title="Ir al final"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
        </button>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        className="sticky bottom-0 border-t border-ink-200 bg-white/95 p-2.5 backdrop-blur sm:p-3 dark:border-ink-800 dark:bg-ink-950/95"
      >
        {pendingImage && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-ink-50 p-2 dark:bg-ink-900">
            <img src={pendingImage} alt="preview" className="h-12 w-12 rounded object-cover" />
            <span className="text-xs text-ink-500">Imagen lista para enviar</span>
            <button type="button" onClick={() => setPendingImage(null)} className="ml-auto text-ink-400 hover:text-red-500"><X className="h-4 w-4" /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <ImageUpload
            label=""
            variant="message"
            folder={storageFolder}
            ownerId={scope.id}
            value={null}
            onChange={(url) => setPendingImage(url)}
          />
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Escribe un mensaje al ${scopeLabel}...`}
            className="input flex-1"
            disabled={sending}
          />
          <button type="submit" disabled={sending || (!input.trim() && !pendingImage)} className="btn-primary shrink-0 px-3 sm:px-4">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
