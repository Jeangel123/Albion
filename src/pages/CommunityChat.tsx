import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { useRealtime, upsertById, removeById } from '../lib/useRealtime';
import { useCommunities } from '../lib/useCommunities';
import { AvatarWithFrame } from '../components/AvatarWithFrame';
import { RankBadge } from '../components/RankBadge';
import { FounderName, isFounderRole } from '../components/FounderStyle';
import { Spinner, EmptyState } from '../components/ui';
import type { Community, Profile, Message, MedievalRank, FrameRarity } from '../lib/types';

type MessageWithSender = Message & { sender: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank' | 'role'> & { frame?: { rarity: FrameRarity; icon: string | null } | null } };

export default function CommunityChatPage() {
  const { slug } = useParams();
  const { profile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const { isMember } = useCommunities();
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: c } = await supabase.from('communities').select('*').eq('slug', slug).maybeSingle();
      if (!c) { setLoading(false); return; }
      setCommunity(c as Community);
      const { data: msg } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames(is_equipped, frame:avatar_frames(rarity, icon)))')
        .eq('room_id', c.id)
        .order('created_at', { ascending: true })
        .limit(200);
      setMessages((msg ?? []) as unknown as MessageWithSender[]);
      setLoading(false);
    })();
  }, [slug]);

  const handleMessageEvent = useCallback(({ eventType, new: row, old: oldRow }: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => {
    if (eventType === 'DELETE' && oldRow?.id) {
      setMessages((list) => removeById(list, oldRow.id));
    } else if (row?.id) {
      supabase
        .from('messages')
        .select('*, sender:profiles(id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames(is_equipped, frame:avatar_frames(rarity, icon)))')
        .eq('id', row.id)
        .maybeSingle()
        .then(({ data }) => { if (data) setMessages((list) => upsertById(list, data as MessageWithSender)); });
    }
  }, []);
  useRealtime<Message>({
    table: 'messages',
    filter: `room_id=eq.${community?.id ?? ''}`,
    onEvent: handleMessageEvent,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const joined = community ? isMember(community.id) : false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !profile || !community || sending) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      room_id: community.id,
      sender_id: profile.id,
      content,
    });
    if (error) {
      console.error('[messages insert]', { roomId: community.id, senderId: profile.id, error });
      push({ type: 'error', message: `No se pudo enviar: ${error.message}` });
      setSending(false);
      return;
    }
    setInput('');
    setSending(false);
  }

  if (loading) return <Spinner className="py-20" />;
  if (!community) return <EmptyState icon={MessageSquare} title="Comunidad no encontrada" action={{ to: '/comunidades', label: 'Ver comunidades' }} />;

  if (!joined) {
    return (
      <div className="container-app py-6">
        <Link to={`/comunidad/${community.slug}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-gold-600">
          <ArrowLeft className="h-4 w-4" /> Volver a la comunidad
        </Link>
        <EmptyState icon={MessageSquare} title="Únete para chatear" hint="Necesitas ser miembro para ver y enviar mensajes." />
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <Link to={`/comunidad/${community.slug}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-gold-600">
        <ArrowLeft className="h-4 w-4" /> {community.name}
      </Link>
      <h1 className="mb-4 font-display text-2xl font-bold text-ink-900 dark:text-white">Chat de {community.name}</h1>

      <div className="card flex h-[65vh] flex-col p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-ink-400">
              No hay mensajes aún. ¡Sé el primero en escribir!
            </div>
          ) : (
            messages.map((m) => {
              const own = m.sender_id === profile?.id;
              const founder = isFounderRole(m.sender?.role);
              return (
                <div key={m.id} className={`flex gap-2 ${own ? 'flex-row-reverse' : ''}`}>
                  <AvatarWithFrame src={m.sender?.avatar_url} alt={m.sender?.username ?? ''} size="sm" to={`/perfil/${m.sender?.username}`} frameRarity={(m.sender as any)?.frame?.rarity ?? null} frameIcon={(m.sender as any)?.frame?.icon ?? null} />
                  <div className={`max-w-[75%] ${own ? 'text-right' : ''}`}>
                    <div className={`mb-0.5 flex items-center gap-1.5 ${own ? 'justify-end' : ''}`}>
                      {founder ? (
                        <FounderName name={own ? 'Tú' : m.sender?.display_name || m.sender?.username || 'Savier'} />
                      ) : (
                        <p className="text-xs text-ink-500">
                          {own ? 'Tú' : m.sender?.display_name || m.sender?.username}
                        </p>
                      )}
                      {m.sender?.medieval_rank && <RankBadge rank={m.sender.medieval_rank as MedievalRank} size="xs" showEmoji={false} />}
                    </div>
                    <div className={`inline-block rounded-2xl px-3 py-2 text-sm ${founder ? 'founder-bubble text-sky-100' : own ? 'bg-gold-500 text-ink-950' : 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100'}`}>
                      {m.content}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={submit} className="border-t border-ink-200 p-3 dark:border-ink-800">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="input flex-1"
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()} className="btn-primary">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
