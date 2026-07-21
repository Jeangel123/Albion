import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Send, ArrowLeft, Trash2, Reply, Smile, X, Image as ImageIcon, MessageCircle, Search, Check, CheckCheck } from 'lucide-react';
import { isSameDay, format, isToday, isYesterday } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { useRealtime, upsertById, removeById } from '../lib/useRealtime';
import { Avatar } from '../components/Avatar';
import { AvatarWithFrame } from '../components/AvatarWithFrame';
import { RankBadge } from '../components/RankBadge';
import { FounderName, isFounderRole } from '../components/FounderStyle';
import { ImageUpload } from '../components/ImageUpload';
import { Spinner } from '../components/ui';
import { REACTIONS, type Whisper, type WhisperReaction, type Profile, type MedievalRank, type FrameRarity, type ReactionType } from '../lib/types';

type WhisperWithSender = Whisper & {
  sender: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank' | 'role'> & {
    frame?: { rarity: FrameRarity; icon: string | null } | null;
  } | null;
  reply_to_message?: WhisperWithSender | null;
};

type Partner = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank' | 'role'> & {
  frame?: { rarity: FrameRarity; icon: string | null } | null;
};

type ThreadMeta = {
  partner: Partner;
  lastMessage: Pick<Whisper, 'id' | 'content' | 'media_url' | 'created_at' | 'sender_id' | 'read_at'>;
  unreadCount: number;
};

function dateLabel(d: Date): string {
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "d 'de' MMMM 'de' yyyy");
}

export default function WhispersPage() {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { push } = useToast();

  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [messages, setMessages] = useState<WhisperWithSender[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<WhisperWithSender | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<Partner[]>([]);
  const [searching, setSearching] = useState(false);
  const [reactionsMap, setReactionsMap] = useState<Record<string, WhisperReaction[]>>({});

  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  // Load threads list
  const loadThreads = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase.rpc('get_whisper_threads', { p_user_id: profile.id });
    if (error) {
      // Fallback: manual query if RPC doesn't exist
      const { data: sent } = await supabase
        .from('whispers')
        .select('id, content, media_url, created_at, sender_id, read_at, recipient_id')
        .eq('sender_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);
      const { data: recv } = await supabase
        .from('whispers')
        .select('id, content, media_url, created_at, sender_id, read_at, recipient_id')
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);
      const all = [...(sent ?? []), ...(recv ?? [])] as (Whisper & { recipient_id: string })[];
      const byPartner: Record<string, ThreadMeta> = {};
      for (const m of all) {
        const partnerId = m.sender_id === profile.id ? m.recipient_id : m.sender_id;
        if (!byPartner[partnerId] || new Date(m.created_at) > new Date(byPartner[partnerId].lastMessage.created_at)) {
          byPartner[partnerId] = {
            partner: { id: partnerId, username: '', display_name: '', avatar_url: null, medieval_rank: 'campesino', role: 'user' },
            lastMessage: { id: m.id, content: m.content, media_url: m.media_url, created_at: m.created_at, sender_id: m.sender_id, read_at: m.read_at },
            unreadCount: 0,
          };
        }
      }
      // Count unread
      const recvUnread = (recv ?? []).filter((m) => m.sender_id !== profile.id && !m.read_at);
      const unreadByPartner: Record<string, number> = {};
      recvUnread.forEach((m) => {
        unreadByPartner[m.sender_id] = (unreadByPartner[m.sender_id] ?? 0) + 1;
      });
      Object.keys(byPartner).forEach((pid) => { byPartner[pid].unreadCount = unreadByPartner[pid] ?? 0; });
      // Load partner profiles
      const partnerIds = Object.keys(byPartner);
      if (partnerIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon))')
          .in('id', partnerIds);
        (profs ?? []).forEach((p: any) => {
          if (byPartner[p.id]) {
            byPartner[p.id].partner = {
              ...p,
              frame: p.frame?.[0]?.is_equipped ? { rarity: p.frame[0].frame?.rarity, icon: p.frame[0].frame?.icon } : null,
            };
          }
        });
      }
      setThreads(Object.values(byPartner).sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()));
      setLoadingThreads(false);
      return;
    }
    setThreads((data ?? []) as ThreadMeta[]);
    setLoadingThreads(false);
  }, [profile]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Load partner profile when username changes
  useEffect(() => {
    if (!username || !profile) { setPartner(null); return; }
    if (username === profile.username) { setPartner(null); return; }
    setPartnerLoading(true);
    setMessages([]);
    setReactionsMap({});
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon))')
      .eq('username', username)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setPartner(null); setPartnerLoading(false); return; }
        const p = data as any;
        setPartner({
          ...p,
          frame: p.frame?.[0]?.is_equipped ? { rarity: p.frame[0].frame?.rarity, icon: p.frame[0].frame?.icon } : null,
        });
        setPartnerLoading(false);
      });
  }, [username, profile]);

  // Load messages for current conversation
  const loadMessages = useCallback(async () => {
    if (!profile || !partner) return;
    setLoadingMsgs(true);
    const { data, error } = await supabase
      .from('whispers')
      .select('*, sender:profiles(id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon)))')
      .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
      .or(`sender_id.eq.${partner.id},recipient_id.eq.${partner.id}`)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) {
      console.error('[whispers] load:', error.message);
      setLoadingMsgs(false);
      return;
    }
    const all = (data ?? []) as unknown as WhisperWithSender[];
    // Filter to only messages between these two users
    const filtered = all.filter(
      (m) =>
        (m.sender_id === profile.id && m.recipient_id === partner.id) ||
        (m.sender_id === partner.id && m.recipient_id === profile.id),
    );
    setMessages(filtered);
    // Load reactions
    if (filtered.length > 0) {
      const ids = filtered.map((m) => m.id);
      const { data: reacts } = await supabase.from('whisper_reactions').select('*').in('whisper_id', ids);
      const rMap: Record<string, WhisperReaction[]> = {};
      (reacts ?? []).forEach((r: WhisperReaction) => {
        if (!rMap[r.whisper_id]) rMap[r.whisper_id] = [];
        rMap[r.whisper_id].push(r);
      });
      setReactionsMap(rMap);
    }
    setLoadingMsgs(false);
    // Mark received messages as read
    const unreadRecv = filtered.filter((m) => m.recipient_id === profile.id && !m.read_at);
    if (unreadRecv.length > 0) {
      const now = new Date().toISOString();
      await supabase.from('whispers').update({ read_at: now }).in('id', unreadRecv.map((m) => m.id));
    }
  }, [profile, partner]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime for whispers
  const handleWhisperEvent = useCallback(({ eventType, new: row, old: oldRow }: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => {
    if (eventType === 'DELETE' && oldRow?.id) {
      setMessages((list) => removeById(list, oldRow.id));
    } else if (row?.id) {
      supabase
        .from('whispers')
        .select('*, sender:profiles(id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon)))')
        .eq('id', row.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          const msg = data as WhisperWithSender;
          setMessages((list) => {
            if (!profile || !partner) return list;
            if (
              (msg.sender_id === profile.id && msg.recipient_id === partner.id) ||
              (msg.sender_id === partner.id && msg.recipient_id === profile.id)
            ) {
              return upsertById(list, msg);
            }
            return list;
          });
          // Auto-mark read if received and at bottom
          if (profile && msg.recipient_id === profile.id && !msg.read_at && atBottom) {
            supabase.from('whispers').update({ read_at: new Date().toISOString() }).eq('id', msg.id);
          }
        });
      loadThreads();
    }
  }, [profile, partner, atBottom, loadThreads]);

  useRealtime<Whisper>({ table: 'whispers', onEvent: handleWhisperEvent });

  // Realtime for reactions
  const handleReactionEvent = useCallback(({ eventType, new: row, old: oldRow }: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => {
    if (eventType === 'DELETE' && oldRow?.id) {
      setReactionsMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((wid) => {
          next[wid] = next[wid].filter((r) => r.id !== oldRow.id);
        });
        return next;
      });
    } else if (row?.id) {
      setReactionsMap((prev) => {
        const next = { ...prev };
        const list = next[row.whisper_id] ?? [];
        const exists = list.some((r) => r.id === row.id);
        next[row.whisper_id] = exists ? list.map((r) => (r.id === row.id ? row : r)) : [...list, row];
        return next;
      });
    }
  }, []);
  useRealtime<WhisperReaction>({ table: 'whisper_reactions', onEvent: handleReactionEvent });

  useEffect(() => {
    if (atBottom) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, atBottom]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  }

  async function sendWhisper() {
    const content = input.trim();
    if ((!content && !pendingImage) || sending || !profile || !partner) return;
    setSending(true);
    try {
      const payload: Record<string, any> = {
        sender_id: profile.id,
        recipient_id: partner.id,
        content: content || null,
        media_url: pendingImage,
      };
      if (replyTo) payload.reply_to = replyTo.id;
      const { data: inserted, error } = await supabase.from('whispers').insert(payload).select('id').single();
      if (error) {
        push({ type: 'error', message: `No se pudo enviar: ${error.message}` });
        return;
      }
      // Insert notification for recipient
      if (inserted) {
        await supabase.from('notifications').insert({
          user_id: partner.id,
          actor_id: profile.id,
          type: 'whisper',
          content: 'te envió un whisper',
          target_type: 'whisper',
          target_id: partner.username,
        });
        supabase
          .from('whispers')
          .select('*, sender:profiles(id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon)))')
          .eq('id', inserted.id)
          .maybeSingle()
          .then(({ data: full }) => {
            if (full) setMessages((list) => upsertById(list, full as WhisperWithSender));
          });
      }
      setInput('');
      setPendingImage(null);
      setReplyTo(null);
      setAtBottom(true);
      loadThreads();
    } finally {
      setSending(false);
    }
  }

  async function deleteWhisper(id: string) {
    const { error } = await supabase.from('whispers').delete().eq('id', id);
    if (error) push({ type: 'error', message: `No se pudo eliminar: ${error.message}` });
  }

  async function toggleReaction(whisperId: string, type: ReactionType) {
    if (!profile) return;
    const existing = (reactionsMap[whisperId] ?? []).find((r) => r.user_id === profile.id && r.type === type);
    if (existing) {
      await supabase.from('whisper_reactions').delete().eq('id', existing.id);
    } else {
      const { error } = await supabase.from('whisper_reactions').insert({ whisper_id: whisperId, user_id: profile.id, type });
      if (error) push({ type: 'error', message: `No se pudo reaccionar: ${error.message}` });
    }
    setReactingTo(null);
  }

  // Search users to start a new whisper
  async function searchUsers(q: string) {
    setSearchQ(q);
    if (!q.trim() || !profile) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, medieval_rank, role, frame:user_frames!user_frames_user_id_fkey(is_equipped, frame:avatar_frames(rarity, icon))')
      .ilike('username', `%${q.trim()}%`)
      .neq('id', profile.id)
      .limit(8);
    setSearchResults((data ?? []) as any);
    setSearching(false);
  }

  if (!profile) return <Spinner className="py-20" />;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const showThreadList = !username || !isMobile;
  const showConversation = !!username || !isMobile;

  return (
    <div className="container-app py-4 sm:py-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">Whispers</h1>
          <p className="text-xs text-purple-600 dark:text-purple-400">Mensajes privados</p>
        </div>
      </div>

      <div className="grid h-[70vh] gap-4 md:grid-cols-[300px_1fr] lg:grid-cols-[320px_1fr]">
        {/* Thread list */}
        {showThreadList && (
          <aside className="card flex flex-col overflow-hidden p-0" style={{ borderColor: 'rgb(217 181 229)', borderWidth: '1px' }}>
            <div className="border-b border-purple-200/50 bg-purple-50/30 px-3 py-3 dark:border-purple-900/40 dark:bg-purple-950/20">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
                <input
                  value={searchQ}
                  onChange={(e) => searchUsers(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="w-full rounded-xl border border-purple-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-purple-500 dark:border-purple-900/60 dark:bg-ink-900"
                />
              </div>
              {searching && <p className="mt-1.5 text-xs text-purple-400">Buscando...</p>}
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { setSearchQ(''); setSearchResults([]); navigate(`/whispers/${u.username}`); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    >
                      <Avatar src={u.avatar_url} alt={u.username} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink-800 dark:text-ink-100">{u.display_name || u.username}</p>
                        <p className="truncate text-[10px] text-ink-400">@{u.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingThreads ? (
                <Spinner />
              ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                  <div className="rounded-2xl bg-purple-100 p-3 dark:bg-purple-950/40">
                    <MessageCircle className="h-6 w-6 text-purple-500" />
                  </div>
                  <p className="text-sm text-ink-500">Sin whispers aún.</p>
                  <p className="text-xs text-ink-400">Busca un usuario arriba para empezar.</p>
                </div>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.partner.id}
                    onClick={() => navigate(`/whispers/${t.partner.username}`)}
                    className={`flex w-full items-center gap-3 border-b border-ink-100 px-3 py-2.5 text-left transition hover:bg-purple-50 dark:border-ink-800 dark:hover:bg-purple-950/20 ${username === t.partner.username ? 'bg-purple-50 dark:bg-purple-950/30' : ''}`}
                  >
                    <Avatar src={t.partner.avatar_url} alt={t.partner.username} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                          {t.partner.display_name || t.partner.username}
                        </p>
                        {t.unreadCount > 0 && (
                          <span className="ml-auto rounded-full bg-purple-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{t.unreadCount}</span>
                        )}
                      </div>
                      <p className="truncate text-xs text-ink-500 dark:text-ink-400">
                        {t.lastMessage.sender_id === profile.id ? 'Tú: ' : ''}
                        {t.lastMessage.content || '[imagen]'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Conversation */}
        {showConversation && (
          <div className="card flex flex-col overflow-hidden p-0" style={{ borderColor: 'rgb(217 181 229)', borderWidth: '1px' }}>
            {/* Header */}
            {partner ? (
              <div className="flex items-center gap-3 border-b border-purple-200/50 bg-purple-50/30 px-3 py-2.5 dark:border-purple-900/40 dark:bg-purple-950/20">
                {isMobile && (
                  <Link to="/whispers" className="rounded-lg p-1.5 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                )}
                <Avatar src={partner.avatar_url} alt={partner.username} size="sm" to={`/perfil/${partner.username}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {isFounderRole(partner.role) ? (
                      <FounderName name={partner.display_name || partner.username} />
                    ) : (
                      <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{partner.display_name || partner.username}</p>
                    )}
                    {partner.medieval_rank && <RankBadge rank={partner.medieval_rank as MedievalRank} size="xs" showEmoji={false} />}
                  </div>
                  <p className="truncate text-xs text-ink-400">@{partner.username}</p>
                </div>
              </div>
            ) : partnerLoading ? (
              <div className="border-b border-purple-200/50 px-3 py-3 dark:border-purple-900/40"><Spinner /></div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="rounded-3xl bg-gradient-to-br from-purple-100 to-purple-50 p-5 dark:from-purple-950/40 dark:to-ink-900">
                  <MessageCircle className="h-10 w-10 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink-800 dark:text-ink-100">Selecciona una conversación</h3>
                  <p className="mt-1 max-w-xs text-sm text-ink-500 dark:text-ink-400">Elige un thread o busca un usuario para enviar un whisper privado.</p>
                </div>
              </div>
            )}

            {partner && (
              <>
                {/* Reply preview */}
                {replyTo && (
                  <div className="flex items-center justify-between gap-2 border-b border-purple-200/40 bg-purple-50/60 px-3 py-2 dark:border-purple-900/30 dark:bg-purple-950/20">
                    <div className="flex min-w-0 items-center gap-2 text-xs text-ink-600 dark:text-ink-300">
                      <Reply className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                      <div className="min-w-0">
                        <p className="font-semibold text-purple-600 dark:text-purple-400">{replyTo.sender_id === profile.id ? 'Tú' : partner.display_name || partner.username}</p>
                        <p className="truncate text-ink-500 dark:text-ink-400">{(replyTo.content || '[imagen]').slice(0, 60)}</p>
                      </div>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600 dark:hover:bg-ink-800">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div ref={scrollRef} onScroll={handleScroll} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4 sm:px-4">
                  {loadingMsgs ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-ink-400">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
                      <p>Cargando whispers...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center animate-fade-in">
                      <div className="rounded-3xl bg-gradient-to-br from-purple-100 to-purple-50 p-5 dark:from-purple-950/40 dark:to-ink-900">
                        <MessageCircle className="h-10 w-10 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-ink-800 dark:text-ink-100">Sin mensajes aún</h3>
                        <p className="mt-1 max-w-xs text-sm text-ink-500 dark:text-ink-400">Envía el primer whisper a {partner.display_name || partner.username}.</p>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      let lastDate: Date | null = null;
                      return messages.map((m, idx) => {
                        const own = m.sender_id === profile.id;
                        const founder = isFounderRole(m.sender?.role);
                        const userReactions = reactionsMap[m.id] ?? [];
                        const reactionCounts: Record<string, WhisperReaction[]> = {};
                        userReactions.forEach((r) => {
                          if (!reactionCounts[r.type]) reactionCounts[r.type] = [];
                          reactionCounts[r.type].push(r);
                        });
                        const msgDate = new Date(m.created_at);
                        const showDateSeparator = !lastDate || !isSameDay(lastDate, msgDate);
                        lastDate = msgDate;
                        const isRead = own && !!m.read_at;
                        const prev = messages[idx - 1];
                        const groupedWithPrev = prev && prev.sender_id === m.sender_id && !showDateSeparator && Math.abs(new Date(prev.created_at).getTime() - msgDate.getTime()) < 5 * 60 * 1000;
                        return (
                          <div key={m.id}>
                            {showDateSeparator && (
                              <div className="my-3 flex items-center justify-center">
                                <span className="rounded-full bg-purple-100 px-3 py-1 text-[11px] font-medium text-purple-600 dark:bg-purple-950/40 dark:text-purple-300">
                                  {dateLabel(msgDate)}
                                </span>
                              </div>
                            )}
                            <div className={`group relative flex gap-2 ${own ? 'flex-row-reverse' : ''} ${groupedWithPrev ? 'mt-0.5' : 'mt-2'}`}>
                              <div className={`shrink-0 ${groupedWithPrev ? 'invisible' : ''}`}>
                                {own ? (
                                  <Avatar src={profile.avatar_url} alt={profile.username} size="sm" />
                                ) : (
                                  <Avatar src={partner.avatar_url} alt={partner.username} size="sm" />
                                )}
                              </div>
                              <div className={`max-w-[80%] sm:max-w-[70%] ${own ? 'items-end text-right' : 'items-start'} flex flex-col`}>
                                {/* Bubble — purple theme */}
                                <div className={`relative inline-block rounded-2xl px-3 py-2 text-sm shadow-sm transition ${own ? 'rounded-tr-md bg-gradient-to-br from-purple-500 to-purple-600 text-white' : 'rounded-tl-md bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100'}`}>
                                  {m.reply_to && (
                                    <div className={`mb-1.5 border-l-2 pl-2 text-xs ${own ? 'border-white/40 text-white/70' : 'border-purple-500/60 text-ink-500 dark:text-ink-400'}`}>
                                      <p className="font-semibold">{m.reply_to_message?.sender_id === profile.id ? 'Tú' : partner.display_name || partner.username}</p>
                                      <p className="truncate">{m.reply_to_message?.content || '[imagen]'}</p>
                                    </div>
                                  )}
                                  {m.media_url && (
                                    <img src={m.media_url} alt="shared" className="mb-1 max-h-52 rounded-lg" />
                                  )}
                                  {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                                  <span className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${own ? 'text-white/60' : 'text-ink-400'}`}>
                                    {format(msgDate, 'HH:mm')}
                                    {own && (isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                                  </span>
                                  <button
                                    onClick={() => setReactingTo(reactingTo === m.id ? null : m.id)}
                                    className={`absolute -top-3 ${own ? '-left-3' : '-right-3'} flex h-6 w-6 items-center justify-center rounded-full border border-ink-200 bg-white text-xs shadow-md transition opacity-0 group-hover:opacity-100 dark:border-ink-700 dark:bg-ink-800 ${reactingTo === m.id ? 'opacity-100' : ''}`}
                                    title="Reaccionar"
                                  >
                                    <Smile className="h-3.5 w-3.5 text-purple-500" />
                                  </button>
                                </div>
                                {Object.keys(reactionCounts).length > 0 && (
                                  <div className={`mt-0.5 flex flex-wrap gap-1 ${own ? 'justify-end' : ''}`}>
                                    {Object.entries(reactionCounts).map(([type, reacts]) => {
                                      const emoji = REACTIONS.find((r) => r.key === type)?.emoji ?? '?';
                                      const mine = reacts.some((r) => r.user_id === profile.id);
                                      return (
                                        <button
                                          key={type}
                                          onClick={() => toggleReaction(m.id, type as ReactionType)}
                                          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs transition ${mine ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-400 dark:bg-purple-900/50 dark:text-purple-300 dark:ring-purple-700' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}
                                        >
                                          <span className="text-sm">{emoji}</span>
                                          <span className="font-medium">{reacts.length}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className={`mt-0.5 flex items-center gap-1 ${own ? 'justify-end' : ''} opacity-0 transition group-hover:opacity-100`}>
                                  <button onClick={() => { setReplyTo(m); }} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-purple-500 dark:hover:bg-ink-800" title="Responder">
                                    <Reply className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => deleteWhisper(m.id)} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-red-500 dark:hover:bg-ink-800" title="Eliminar">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                                {reactingTo === m.id && (
                                  <>
                                    <div className="fixed inset-0 z-20" onClick={() => setReactingTo(null)} />
                                    <div className={`absolute z-30 mt-1 flex gap-1 rounded-full border border-ink-200 bg-white px-2 py-1.5 shadow-xl animate-fade-in dark:border-ink-700 dark:bg-ink-800 ${own ? 'right-0' : 'left-0'}`}>
                                      {REACTIONS.map((r) => {
                                        const mine = userReactions.some((x) => x.user_id === profile.id && x.type === r.key);
                                        return (
                                          <button
                                            key={r.key}
                                            onClick={() => toggleReaction(m.id, r.key)}
                                            className={`rounded-full p-1 text-xl transition hover:scale-125 ${mine ? 'ring-2 ring-purple-400' : ''}`}
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
                      });
                    })()
                  )}
                  <div ref={endRef} />
                </div>

                {/* Input */}
                <form onSubmit={(e) => { e.preventDefault(); sendWhisper(); }} className="sticky bottom-0 border-t border-purple-200/50 bg-white/95 p-2.5 backdrop-blur sm:p-3 dark:border-purple-900/40 dark:bg-ink-950/95">
                  {pendingImage && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg bg-purple-50 p-2 dark:bg-purple-950/30">
                      <img src={pendingImage} alt="preview" className="h-12 w-12 rounded object-cover" />
                      <span className="text-xs text-purple-600 dark:text-purple-400">Imagen lista para enviar</span>
                      <button type="button" onClick={() => setPendingImage(null)} className="ml-auto text-ink-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ImageUpload label="" variant="message" folder="whispers" ownerId={profile.id} value={null} onChange={(url) => setPendingImage(url)} />
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={`Escribe un whisper a ${partner.display_name || partner.username}...`}
                      className="input flex-1"
                      disabled={sending}
                    />
                    <button type="submit" disabled={sending || (!input.trim() && !pendingImage)} className="shrink-0 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 px-3 py-2 text-white shadow-md transition hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 sm:px-4">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
