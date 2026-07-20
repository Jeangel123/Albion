import { supabase } from './supabase';
import type { Achievement, UserAchievement, UserInterest, CommunityMission, UserMission } from './types';

export async function getAchievements(): Promise<Achievement[]> {
  const { data } = await supabase.from('achievements').select('*').order('points', { ascending: false });
  return (data ?? []) as Achievement[];
}

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  return (data ?? []) as UserAchievement[];
}

export async function grantAchievement(userId: string, slug: string, metadata?: Record<string, unknown>) {
  const { data: ach } = await supabase.from('achievements').select('id').eq('slug', slug).maybeSingle();
  if (!ach) return false;
  const { error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_id: ach.id, metadata: metadata ?? null });
  return !error;
}

export async function getUserInterests(userId: string): Promise<UserInterest[]> {
  const { data } = await supabase.from('user_interests').select('*').eq('user_id', userId);
  return (data ?? []) as UserInterest[];
}

export async function setUserInterests(userId: string, interests: string[]): Promise<boolean> {
  await supabase.from('user_interests').delete().eq('user_id', userId);
  if (interests.length === 0) return true;
  const rows = interests.map((interest) => ({ user_id: userId, interest }));
  const { error } = await supabase.from('user_interests').insert(rows);
  return !error;
}

export async function getMissions(): Promise<CommunityMission[]> {
  const { data } = await supabase.from('community_missions').select('*').eq('is_active', true).order('created_at');
  return (data ?? []) as CommunityMission[];
}

export async function getUserMissions(userId: string): Promise<UserMission[]> {
  const { data } = await supabase
    .from('user_missions')
    .select('*, mission:community_missions(*)')
    .eq('user_id', userId)
    .order('created_at');
  return (data ?? []) as UserMission[];
}

export const RANK_TITLES: Record<string, string> = {
  campesino: 'Campesino del Reino',
  escudero: 'Escudero de la Corona',
  caballero: 'Caballero del Reino',
  caballero_real: 'Caballero Real de la Corte',
  baron: 'Barón de la Corte',
  conde: 'Conde del Imperio',
  duque: 'Duque del Reino',
  lord: 'Lord del Imperio',
  rey: 'Rey del Imperio',
  emperador: 'Emperador del Reino',
};

export function getRankTitle(medievalRank?: string | null): string {
  if (!medievalRank) return 'Campesino del Reino';
  return RANK_TITLES[medievalRank] ?? 'Campesino del Reino';
}
