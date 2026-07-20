import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { useRealtime } from './useRealtime';
import type { Wallet, Transaction } from './types';

export function useWallet() {
  const { profile } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [wRes, tRes] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', profile.id).maybeSingle(),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (wRes.error) console.error('[wallet] load:', wRes.error.message);
      if (tRes.error) console.error('[wallet] transactions:', tRes.error.message);
      if (!wRes.error && wRes.data) setWallet(wRes.data as Wallet);
      if (!tRes.error && tRes.data) setTransactions(tRes.data as Transaction[]);
    } catch (err) {
      console.error('[wallet] fatal:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime<Wallet>({
    table: 'wallets',
    filter: `user_id=eq.${profile?.id ?? ''}`,
    onEvent: ({ eventType, new: row }) => {
      if (eventType === 'DELETE' || !row) return;
      setWallet(row as Wallet);
    },
  });

  useRealtime<Transaction>({
    table: 'transactions',
    filter: `user_id=eq.${profile?.id ?? ''}`,
    onEvent: ({ eventType, new: row }) => {
      if (eventType === 'DELETE' || !row) return;
      setTransactions((prev) => [row as Transaction, ...prev].slice(0, 50));
    },
  });

  return { wallet, transactions, loading, refresh: load };
}
