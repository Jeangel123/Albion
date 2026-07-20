import { useCallback, useEffect, useState } from 'react';
import { Globe, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { ChatPanel } from '../components/ChatPanel';
import { Avatar } from '../components/Avatar';
import { Spinner } from '../components/ui';
import { useRealtime } from '../lib/useRealtime';
import type { Profile } from '../lib/types';

export const GLOBAL_ROOM_ID = '00000000-0000-0000-0000-000000000001';

type Participant = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'medieval_rank' | 'role'>;

export default function GlobalChatPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    (async () => {
      await supabase
        .from('chat_room_members')
        .upsert({ room_id: GLOBAL_ROOM_ID, user_id: profile.id }, { onConflict: 'room_id,user_id' });
      if (mounted) setReady(true);
    })();
    return () => { mounted = false; };
  }, [profile]);

  const loadParticipants = useCallback(async () => {
    const { data } = await supabase
      .from('chat_room_members')
      .select('user:profiles(id, username, display_name, avatar_url, medieval_rank, role)')
      .eq('room_id', GLOBAL_ROOM_ID)
      .order('joined_at', { ascending: true })
      .limit(50);
    if (data) {
      const list = data.map((r: any) => r.user).filter(Boolean) as Participant[];
      setParticipants(list);
    }
  }, []);

  useEffect(() => { loadParticipants(); }, [loadParticipants]);

  // Realtime: update participants when membership changes
  useRealtime({
    table: 'chat_room_members',
    filter: `room_id=eq.${GLOBAL_ROOM_ID}`,
    onEvent: () => { loadParticipants(); },
  });

  if (!profile) return <Spinner className="py-20" />;
  if (!ready) return <Spinner className="py-20" />;

  const isStaff = profile.role === 'founder' || profile.role === 'supreme_admin' || profile.role === 'admin' || profile.role === 'moderator';

  return (
    <div className="container-app py-6">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="h-6 w-6 text-gold-500" />
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">{t('chat.global.title')}</h1>
      </div>
      <p className="mb-4 text-sm text-ink-500 dark:text-ink-400">
        {t('chat.global.subtitle')}
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <ChatPanel
          scope={{ kind: 'room', id: GLOBAL_ROOM_ID }}
          currentUserId={profile.id}
          canModerate={isStaff}
          useFrames
          storageFolder="chat-global"
        />

        {/* Participants sidebar */}
        <aside className="card hidden h-[60vh] flex-col p-0 lg:flex">
          <div className="flex items-center gap-2 border-b border-ink-200 px-4 py-3 dark:border-ink-800">
            <Users className="h-4 w-4 text-ink-500" />
            <h2 className="text-sm font-semibold text-ink-700 dark:text-ink-200">
              {t('chat.global.participants')}
            </h2>
            <span className="ml-auto chip bg-ink-100 text-[10px] text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              {participants.length}
            </span>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-50 dark:hover:bg-ink-900">
                <Avatar src={p.avatar_url} alt={p.username} size="xs" to={`/perfil/${p.username}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink-700 dark:text-ink-200">
                    {p.display_name || p.username}
                  </p>
                  <p className="truncate text-[10px] text-ink-400">@{p.username}</p>
                </div>
                {p.id === profile.id && (
                  <span className="chip bg-gold-100 text-[9px] text-gold-700 dark:bg-gold-900 dark:text-gold-300">Tú</span>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
