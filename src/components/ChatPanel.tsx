import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Trash2, Reply, Smile, Image as ImageIcon, X } from 'lucide-react';
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

export function ChatPanel({ scope, currentUserId, canModerate, useFrames = false, storageFolder }: ChatPanelProps) {
  const { push } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const filterCol = scope.kind === 'guild' ? 'guild_id' : 'room_id';
  const filter = `${filterCol}=eq.${scope.id}`;

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames(is_equipped, frame:avatar_frames(rarity, icon)))')
      .eq(filterCol, scope.id)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) { console.error('[chat] load:', error.message); return; }
    const msgs = (data ?? []) as unknown as ChatMessage[];
    // Load reactions for these messages
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
    setLoading(false);
  }, [scope.id, filterCol]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Mark messages as read on load and on new message
  const markRead = useCallback(async () => {
    if (!currentUserId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    const readData = {
      user_id: currentUserId,
      [filterCol]: scope.id,
      last_read_message_id: lastMsg.id,
      last_read_at: new Date().toISOString(),
    };
    await supabase.from('message_reads').upsert(readData, { onConflict: 'user_id,guild_id,room_id' });
  }, [currentUserId, messages, scope.id, filterCol]);

  useEffect(() => { markRead(); }, [markRead]);

  // Realtime: messages
  const handleMessageEvent = useCallback(({ eventType, new: row, old: oldRow }: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => {
    if (eventType === 'DELETE' && oldRow?.id) {
      setMessages((list) => removeById(list, oldRow.id));
    } else if (row?.id) {
      supabase
        .from('messages')
        .select('*, sender:profiles(id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames(is_equipped, frame:avatar_frames(rarity, icon)))')
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

  // Realtime: reactions
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
  useRealtime<MessageReaction>({ table: 'message_reactions', filter: `message_id=in.(${messages.map((m) => m.id).join(',')})`, onEvent: handleReactionEvent });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
      const { error } = await supabase.from('messages').insert(payload);
      if (error) {
        console.error('[chat] send:', error);
        push({ type: 'error', message: `No se pudo enviar: ${error.message}` });
        return;
      }
      setInput('');
      setPendingImage(null);
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(messageId: string) {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) push({ type: 'error', message: `No se pudo eliminar: ${error.message}` });
  }

  async function toggleReaction(messageId: string, type: ReactionType) {
    // Check if user already has this reaction
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

  return (
    <div className="card flex h-[60vh] flex-col p-0">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-4 py-2 dark:border-ink-800 dark:bg-ink-900">
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Reply className="h-3 w-3" />
            <span>Respondiendo a <strong>{replyTo.sender?.display_name || replyTo.sender?.username || 'usuario'}</strong>: {(replyTo.content || '[imagen]').slice(0, 50)}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-ink-400 hover:text-ink-600"><X className="h-3 w-3" /></button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-400">Cargando mensajes...</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-400">
            No hay mensajes aún. ¡Sé el primero en escribir!
          </div>
        ) : (
          messages.map((m) => {
            const own = m.sender_id === currentUserId;
            const founder = isFounderRole(m.sender?.role);
            const canDelete = own || canModerate;
            const userReactions = m.reactions ?? [];
            const reactionCounts: Record<string, MessageReaction[]> = {};
            userReactions.forEach((r) => {
              if (!reactionCounts[r.type]) reactionCounts[r.type] = [];
              reactionCounts[r.type].push(r);
            });
            return (
              <div key={m.id} className={`group relative flex gap-2 ${own ? 'flex-row-reverse' : ''}`}>
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
                <div className={`max-w-[75%] ${own ? 'text-right' : ''}`}>
                  {/* Reply indicator */}
                  {m.reply_to && (
                    <div className={`mb-0.5 text-xs text-ink-400 ${own ? 'text-right' : ''}`}>
                      <Reply className="inline h-3 w-3" /> Respondiendo a un mensaje
                    </div>
                  )}
                  <div className={`mb-0.5 flex items-center gap-1.5 ${own ? 'justify-end' : ''}`}>
                    {founder ? (
                      <FounderName name={own ? 'Tú' : m.sender?.display_name || m.sender?.username || ''} />
                    ) : (
                      <p className="text-xs text-ink-500">{own ? 'Tú' : m.sender?.display_name || m.sender?.username}</p>
                    )}
                    {m.sender?.medieval_rank && <RankBadge rank={m.sender.medieval_rank as MedievalRank} size="xs" showEmoji={false} />}
                  </div>
                  <div className={`inline-block rounded-2xl px-3 py-2 text-sm ${founder ? 'founder-bubble text-sky-100' : own ? 'bg-gold-500 text-ink-950' : 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100'}`}>
                    {m.message_type === 'image' && m.media_url && (
                      <img src={m.media_url} alt="shared" className="mb-1 max-h-48 rounded-lg" />
                    )}
                    {m.content}
                  </div>
                  {/* Reactions */}
                  {Object.keys(reactionCounts).length > 0 && (
                    <div className={`mt-1 flex flex-wrap gap-1 ${own ? 'justify-end' : ''}`}>
                      {Object.entries(reactionCounts).map(([type, reacts]) => {
                        const emoji = REACTIONS.find((r) => r.key === type)?.emoji ?? '?';
                        const mine = reacts.some((r) => r.user_id === currentUserId);
                        return (
                          <span key={type} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs ${mine ? 'bg-gold-100 text-gold-700 dark:bg-gold-900 dark:text-gold-300' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
                            {emoji} {reacts.length}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className={`mt-0.5 flex items-center gap-2 ${own ? 'justify-end' : ''}`}>
                    <p className="text-xs text-ink-400">
                      {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => setReactingTo(reactingTo === m.id ? null : m.id)} className="text-ink-400 hover:text-gold-500" title="Reaccionar">
                        <Smile className="h-3 w-3" />
                      </button>
                      <button onClick={() => startReply(m)} className="text-ink-400 hover:text-gold-500" title="Responder">
                        <Reply className="h-3 w-3" />
                      </button>
                      {canDelete && (
                        <button onClick={() => deleteMessage(m.id)} className="text-ink-400 hover:text-red-500" title="Eliminar">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Reaction picker */}
                  {reactingTo === m.id && (
                    <div className={`absolute z-10 mt-1 flex gap-1 rounded-lg border border-ink-200 bg-white p-1.5 shadow-lg dark:border-ink-700 dark:bg-ink-800 ${own ? 'right-0' : 'left-0'}`}>
                      {REACTIONS.map((r) => (
                        <button key={r.key} onClick={() => toggleReaction(m.id, r.key)} className="rounded p-1 text-lg hover:bg-ink-100 dark:hover:bg-ink-700" title={r.label}>
                          {r.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        className="border-t border-ink-200 p-3 dark:border-ink-800"
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
          <button type="submit" disabled={sending || (!input.trim() && !pendingImage)} className="btn-primary">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
