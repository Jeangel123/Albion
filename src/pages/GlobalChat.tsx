import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { ChatPanel } from '../components/ChatPanel';
import { Spinner } from '../components/ui';

export const GLOBAL_ROOM_ID = '00000000-0000-0000-0000-000000000001';

export default function GlobalChatPage() {
  const { profile } = useAuth();
  const [ready, setReady] = useState(false);

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

  if (!profile) return <Spinner className="py-20" />;
  if (!ready) return <Spinner className="py-20" />;

  const isStaff = profile.role === 'founder' || profile.role === 'supreme_admin' || profile.role === 'admin' || profile.role === 'moderator';

  return (
    <div className="container-app py-6">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="h-6 w-6 text-gold-500" />
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Chat Global</h1>
      </div>
      <p className="mb-4 text-sm text-ink-500 dark:text-ink-400">
        Comunidad general. Sé respetuoso y sigue las reglas de la plataforma.
      </p>
      <ChatPanel
        scope={{ kind: 'room', id: GLOBAL_ROOM_ID }}
        currentUserId={profile.id}
        canModerate={isStaff}
        useFrames
        storageFolder="chat-global"
      />
    </div>
  );
}
