import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

type EventType = 'INSERT' | 'UPDATE' | 'DELETE';
type Row = Record<string, any>;

type ChangeHandler<T extends Row = Row> = (payload: {
  eventType: EventType;
  new: T | null;
  old: T | null;
}) => void;

/**
 * Subscribe to Supabase Realtime changes on a table.
 * - Dedupes subscriptions by key (one channel per table+filter).
 * - Cleans up on unmount.
 * - Pass a stable `onEvent` (wrap in useCallback) to avoid re-subscribing.
 */
export function useRealtime<T extends Row = Row>(opts: {
  table: string;
  filter?: string;
  onEvent: ChangeHandler<T>;
  events?: EventType[];
}) {
  const onEventRef = useRef(opts.onEvent);
  onEventRef.current = opts.onEvent;

  const { table, filter, events = ['INSERT', 'UPDATE', 'DELETE'] } = opts;

  useEffect(() => {
    const channelName = `rt:${table}${filter ? `:${filter}` : ''}`;
    let channel = supabase.channel(channelName);

    events.forEach((evt) => {
      channel = channel.on('postgres_changes' as any, { event: evt, schema: 'public', table, filter } as any, (payload: any) => {
        onEventRef.current({
          eventType: payload.eventType as EventType,
          new: (payload.new as T) ?? null,
          old: (payload.old as T) ?? null,
        });
      });
    });

    channel.subscribe((status: string, err?: Error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`[realtime] ${channelName} subscribe error:`, status, err?.message ?? '');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, events.join(',')]);
}

/** Upsert helper for array state: replace by id, or prepend. */
export function upsertById<T extends { id: string }>(list: T[], row: T): T[] {
  const idx = list.findIndex((x) => x.id === row.id);
  if (idx === -1) return [row, ...list];
  const copy = [...list];
  copy[idx] = { ...copy[idx], ...row };
  return copy;
}

/** Remove helper for array state by id. */
export function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}
