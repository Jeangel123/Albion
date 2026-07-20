import { supabase } from './supabase';
import { useAuth } from './auth';
import { MEDIEVAL_RANKS, type MedievalRank } from './types';

export const REPUTATION_POINTS: Record<string, number> = {
  create_post: 10,
  create_community: 25,
  send_message: 2,
  receive_reaction: 5,
};

export const COIN_REWARDS: Record<string, number> = {
  create_post: 5,
  create_community: 20,
  send_message: 1,
  receive_reaction: 3,
  daily_login: 10,
};

export async function awardReputation(
  userId: string,
  action: string,
  referenceType?: string,
  referenceId?: string,
): Promise<void> {
  const repPoints = REPUTATION_POINTS[action] ?? 0;
  const coins = COIN_REWARDS[action] ?? 0;

  if (repPoints > 0) {
    await supabase.from('reputation_log').insert({
      user_id: userId,
      action,
      points: repPoints,
      reference_type: referenceType ?? null,
      reference_id: referenceId ?? null,
    });
    await supabase.rpc('increment_reputation', { p_user_id: userId, p_points: repPoints }).then(({ error }) => {
      if (error) {
        supabase.from('profiles')
          .select('reputation_points')
          .eq('id', userId)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              supabase.from('profiles')
                .update({ reputation_points: (data as any).reputation_points + repPoints })
                .eq('id', userId)
                .then(() => checkRankUp(userId, (data as any).reputation_points + repPoints));
            }
          });
      } else {
        supabase.from('profiles').select('reputation_points').eq('id', userId).maybeSingle()
          .then(({ data }) => { if (data) checkRankUp(userId, (data as any).reputation_points); });
      }
    });
  }

  if (coins > 0) {
    const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle();
    if (wallet) {
      await supabase.from('wallets').update({ balance: (wallet as any).balance + coins, updated_at: new Date().toISOString() }).eq('user_id', userId);
    } else {
      await supabase.from('wallets').insert({ user_id: userId, balance: coins });
    }
    await supabase.from('transactions').insert({
      user_id: userId,
      amount: coins,
      type: 'earn',
      reference: action,
      description: `Recompensa por ${action.replace(/_/g, ' ')}`,
    });
  }
}

async function checkRankUp(userId: string, totalPoints: number): Promise<void> {
  const sorted = [...MEDIEVAL_RANKS].sort((a, b) => b.min_points - a.min_points);
  const newRank = (sorted.find((r) => totalPoints >= r.min_points) ?? MEDIEVAL_RANKS[0]).key as MedievalRank;
  const { data: profile } = await supabase.from('profiles').select('medieval_rank').eq('id', userId).maybeSingle();
  if (profile && (profile as any).medieval_rank !== newRank) {
    await supabase.from('profiles').update({ medieval_rank: newRank }).eq('id', userId);
  }
}

export async function purchaseFrame(
  userId: string,
  frameId: string,
  price: number,
): Promise<{ error: string | null }> {
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle();
  const balance = (wallet as any)?.balance ?? 0;
  if (balance < price) return { error: 'Saldo insuficiente' };

  const { data: existing } = await supabase.from('user_frames').select('id').eq('user_id', userId).eq('frame_id', frameId).maybeSingle();
  if (existing) return { error: 'Ya posees este marco' };

  const { error: wErr } = await supabase.from('wallets').update({ balance: balance - price, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (wErr) return { error: wErr.message };

  const { error: tErr } = await supabase.from('transactions').insert({
    user_id: userId,
    amount: -price,
    type: 'spend',
    reference: 'purchase_frame',
    description: `Compra de marco`,
  });
  if (tErr) return { error: tErr.message };

  const { error: ufErr } = await supabase.from('user_frames').insert({ user_id: userId, frame_id: frameId });
  if (ufErr) return { error: ufErr.message };

  return { error: null };
}

export async function claimFreeFrame(
  userId: string,
  frameId: string,
): Promise<{ error: string | null }> {
  const { data: existing } = await supabase.from('user_frames').select('id').eq('user_id', userId).eq('frame_id', frameId).maybeSingle();
  if (existing) return { error: 'Ya posees este marco' };

  const { error } = await supabase.from('user_frames').insert({ user_id: userId, frame_id: frameId });
  return { error: error?.message ?? null };
}
