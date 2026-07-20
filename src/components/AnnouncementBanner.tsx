import { useEffect, useState } from 'react';
import { Megaphone, Pin, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { GlobalAnnouncement } from '../lib/types';

export function AnnouncementBanner() {
  const [items, setItems] = useState<GlobalAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    load();
    const channel = supabase
      .channel('announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_announcements' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function load() {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('global_announcements')
      .select('*')
      .eq('is_active', true)
      .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setItems(data as GlobalAnnouncement[]);
  }

  const visible = items.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-0">
      {visible.slice(0, 1).map((a) => (
        <div
          key={a.id}
          className={`flex items-center gap-3 px-4 py-2.5 text-sm animate-fade-in ${a.is_pinned ? 'bg-gold-600 text-ink-950' : 'bg-gold-500/90 text-ink-950'}`}
        >
          {a.is_pinned ? <Pin className="h-4 w-4 shrink-0" /> : <Megaphone className="h-4 w-4 shrink-0" />}
          <div className="flex-1">
            {a.title && <span className="font-semibold">{a.title}: </span>}
            <span>{a.content}</span>
          </div>
          <button
            onClick={() => setDismissed((prev) => new Set(prev).add(a.id))}
            className="shrink-0 rounded p-0.5 hover:bg-black/10"
            aria-label="Cerrar anuncio"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
