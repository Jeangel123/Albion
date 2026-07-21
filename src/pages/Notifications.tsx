import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, MessageCircle, Share2, UserPlus, Calendar, CheckCheck, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { Spinner, EmptyState } from '../components/ui';
import { timeAgo } from '../lib/format';
import type { Notification, Profile } from '../lib/types';

type NotifWithActor = Notification & { actor: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null };

const ICONS: Record<string, typeof Bell> = {
  comment: MessageCircle, reaction: Heart, share: Share2, follow: UserPlus, event: Calendar, message: MessageCircle, guild_invite: UserPlus, whisper: MessageSquare,
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const [notifs, setNotifs] = useState<NotifWithActor[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, actor:profiles(id, username, display_name, avatar_url)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) console.error('[notifications] load:', error.message);
      if (active) setNotifs(data as NotifWithActor[] ?? []);
    })();
    return () => { active = false; };
  }, [profile]);

  async function markAll() {
    if (!profile || !notifs) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifs((n) => n?.map((x) => ({ ...x, is_read: true })) ?? null);
    push({ type: 'success', message: 'Todo marcado como leído' });
  }

  if (!profile) return <EmptyState icon={Bell} title="Inicia sesión" action={{ to: '/login', label: 'Iniciar sesión' }} />;

  return (
    <div className="container-app max-w-2xl py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Notificaciones</h1>
        {notifs && notifs.some((n) => !n.is_read) && (
          <button onClick={markAll} className="btn-ghost text-sm"><CheckCheck className="h-4 w-4" /> Marcar todo</button>
        )}
      </div>
      {!notifs ? <Spinner /> : notifs.length === 0 ? (
        <EmptyState icon={Bell} title="Sin notificaciones" hint="Cuando alguien interactúe contigo, lo verás aquí." />
      ) : (
        <div className="card divide-y divide-ink-100 dark:divide-ink-800">
          {notifs.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            const linkTo = n.type === 'whisper' ? `/whispers/${n.target_id}` : n.target_type === 'post' ? `/publicacion/${n.target_id}` : n.target_type === 'profile' ? `/perfil/${n.actor?.username ?? ''}` : '/';
            return (
              <Link key={n.id} to={linkTo} className={`flex items-center gap-3 p-4 hover:bg-ink-50 dark:hover:bg-ink-800/50 ${!n.is_read ? (n.type === 'whisper' ? 'bg-purple-50 dark:bg-purple-950/20' : 'bg-gold-50 dark:bg-gold-950/20') : ''}`}>
                <div className="relative">
                  <Avatar src={n.actor?.avatar_url} alt={n.actor?.username ?? ''} size="md" />
                  <span className={`absolute -bottom-1 -right-1 rounded-full p-1 text-ink-950 ${n.type === 'whisper' ? 'bg-purple-500' : 'bg-gold-500'}`}><Icon className="h-3 w-3" /></span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-800 dark:text-ink-100">
                    <strong>{n.actor?.display_name || n.actor?.username || 'Alguien'}</strong> {n.content || 'interactuó contigo'}
                  </p>
                  <p className="text-xs text-ink-400">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <span className="h-2 w-2 rounded-full bg-gold-500" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
