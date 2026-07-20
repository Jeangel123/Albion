import { supabase } from './supabase';
import { useAuth } from './auth';
import { MEDIEVAL_RANKS, type MedievalRank, BOOST_PRICES } from './types';

export { BOOST_PRICES };

export const REPUTATION_POINTS: Record<string, number> = {
  create_post: 10,
  create_community: 25,
  send_message: 2,
  receive_reaction: 5,
  create_suggestion: 15,
  suggestion_vote: 1,
  suggestion_status_changed: 5,
};

export const COIN_REWARDS: Record<string, number> = {
  create_post: 5,
  create_community: 20,
  send_message: 1,
  receive_reaction: 3,
  daily_login: 10,
  create_suggestion: 10,
  suggestion_vote: 1,
  suggestion_status_changed: 5,
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

async function spendSilver(userId: string, amount: number, reference: string, description: string): Promise<{ error: string | null }> {
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle();
  const balance = (wallet as any)?.balance ?? 0;
  if (balance < amount) return { error: 'Saldo insuficiente' };

  const { error: wErr } = await supabase.from('wallets').update({ balance: balance - amount, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (wErr) return { error: wErr.message };

  const { error: tErr } = await supabase.from('transactions').insert({
    user_id: userId, amount: -amount, type: 'spend', reference, description,
  });
  if (tErr) return { error: tErr.message };

  return { error: null };
}

export async function boostPost(userId: string, postId: string, hours: 24 | 72): Promise<{ error: string | null }> {
  const price = hours === 24 ? BOOST_PRICES.post_24h : BOOST_PRICES.post_72h;
  const { error } = await spendSilver(userId, price, 'boost_post', `Destacar publicacion (${hours}h)`);
  if (error) return { error };

  const until = new Date(Date.now() + hours * 3600_000).toISOString();
  const { error: pErr } = await supabase.from('posts').update({ is_boosted: true, boosted_until: until }).eq('id', postId).eq('author_id', userId);
  return { error: pErr?.message ?? null };
}

export async function promoteGuild(userId: string, guildId: string, hours: 24 | 72): Promise<{ error: string | null }> {
  const price = hours === 24 ? BOOST_PRICES.guild_24h : BOOST_PRICES.guild_72h;
  const { error } = await spendSilver(userId, price, 'promote_guild', `Promocionar gremio (${hours}h)`);
  if (error) return { error };

  const until = new Date(Date.now() + hours * 3600_000).toISOString();
  const { error: gErr } = await supabase.from('guilds').update({ is_boosted: true, boosted_until: until }).eq('id', guildId);
  return { error: gErr?.message ?? null };
}

export async function createPaidEvent(userId: string, payload: { title: string; description: string; start_time: string; location?: string }): Promise<{ error: string | null }> {
  const { error } = await spendSilver(userId, BOOST_PRICES.event, 'create_event', `Crear evento: ${payload.title}`);
  if (error) return { error };

  const { error: eErr } = await supabase.from('events').insert({
    title: payload.title,
    description: payload.description,
    start_time: payload.start_time,
    location: payload.location ?? null,
    created_by: userId,
  });
  return { error: eErr?.message ?? null };
}

export async function requestBadgeReview(userId: string, badgeId: string, reason: string): Promise<{ error: string | null }> {
  const { error } = await spendSilver(userId, BOOST_PRICES.badge_review, 'badge_review', 'Solicitud de revision de insignia');
  if (error) return { error };

  const { data: existing } = await supabase.from('badge_review_requests')
    .select('id').eq('user_id', userId).eq('badge_id', badgeId).eq('status', 'pending').maybeSingle();
  if (existing) return { error: 'Ya tienes una solicitud pendiente para esta insignia' };

  const { error: rErr } = await supabase.from('badge_review_requests').insert({
    user_id: userId, badge_id: badgeId, reason, cost: BOOST_PRICES.badge_review,
  });
  return { error: rErr?.message ?? null };
}
