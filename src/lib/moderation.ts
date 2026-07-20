import { supabase } from './supabase';

export const REPORT_CATEGORIES = [
  { key: 'inappropriate', label: 'Contenido inapropiado', emoji: '🔞', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  { key: 'harassment', label: 'Acoso o amenazas', emoji: '⚠️', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  { key: 'spam', label: 'Spam o publicidad', emoji: '📨', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { key: 'scam', label: 'Estafa', emoji: '🎭', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  { key: 'illegal', label: 'Contenido ilegal', emoji: '🚫', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  { key: 'other', label: 'Otro', emoji: '📋', color: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300' },
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]['key'];

export const SANCTION_TYPES = [
  { key: 'warning', label: 'Advertencia', emoji: '⚠️', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { key: 'suspension', label: 'Suspensión temporal', emoji: '⏸️', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  { key: 'ban', label: 'Bloqueo', emoji: '🔨', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  { key: 'unban', label: 'Levantar sanción', emoji: '✅', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
] as const;

export type SanctionType = (typeof SANCTION_TYPES)[number]['key'];

export type Sanction = {
  id: string;
  user_id: string;
  issued_by: string | null;
  type: SanctionType;
  reason: string | null;
  duration_hours: number | null;
  expires_at: string | null;
  is_active: boolean;
  related_report_id: string | null;
  created_at: string;
  issuer?: Pick<Profile, 'username' | 'display_name'> | null;
};

import type { Profile } from './types';

export async function createReport(
  reporterId: string,
  targetType: string,
  targetId: string,
  reason: string,
  category: ReportCategory,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason: reason.trim(),
    category,
    status: 'open',
  });
  return { error: error?.message ?? null };
}

export async function issueSanction(params: {
  userId: string;
  issuedBy: string;
  type: SanctionType;
  reason?: string;
  durationHours?: number;
  relatedReportId?: string;
}): Promise<{ error: string | null }> {
  const { userId, issuedBy, type, reason, durationHours, relatedReportId } = params;
  const expiresAt = type === 'suspension' && durationHours
    ? new Date(Date.now() + durationHours * 3600_000).toISOString()
    : null;

  const { error } = await supabase.from('sanctions').insert({
    user_id: userId,
    issued_by: issuedBy,
    type,
    reason: reason ?? null,
    duration_hours: durationHours ?? null,
    expires_at: expiresAt,
    is_active: type !== 'unban',
    related_report_id: relatedReportId ?? null,
  });
  if (error) return { error: error.message };

  if (type === 'suspension' || type === 'ban') {
    await supabase.from('profiles').update({ is_suspended: true }).eq('id', userId);
  } else if (type === 'unban') {
    await supabase.from('profiles').update({ is_suspended: false }).eq('id', userId);
    await supabase.from('sanctions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('type', ['suspension', 'ban']);
  }

  await logAction(issuedBy, type === 'unban' ? 'lift_sanction' : 'issue_sanction', 'profile', userId, `${type}: ${reason ?? ''}`);

  return { error: null };
}

export async function logAction(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: string,
  result?: string,
): Promise<void> {
  await supabase.from('audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    details: details ?? null,
    result: result ?? null,
  });
}

export async function getUserSanctions(userId: string): Promise<Sanction[]> {
  const { data } = await supabase
    .from('sanctions')
    .select('*, issuer:profiles!issued_by(username, display_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as unknown as Sanction[];
}

export const AI_FLAG_CATEGORIES = [
  { key: 'spam', label: 'Spam detectado', emoji: '📨' },
  { key: 'inappropriate', label: 'Contenido inapropiado', emoji: '🔞' },
  { key: 'harassment', label: 'Posible acoso', emoji: '⚠️' },
  { key: 'scam', label: 'Posible estafa', emoji: '🎭' },
  { key: 'other', label: 'Otro', emoji: '📋' },
] as const;

export type AIFlagStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

export type AIFlag = {
  id: string;
  target_type: string;
  target_id: string | null;
  target_content: string | null;
  flag_reason: string;
  confidence: number;
  category: string;
  status: AIFlagStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
};
