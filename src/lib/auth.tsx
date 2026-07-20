import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useRealtime } from './useRealtime';
import type { Profile } from './types';

type AuthCtx = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionResolveRef = useRef<((s: Session | null) => void) | null>(null);

  async function loadProfile(uid: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) {
      console.error('[auth] loadProfile error:', error.message);
      setProfile(null);
      return;
    }
    if (data) setProfile(data as Profile);
    else {
      console.warn('[auth] No profile row found for uid:', uid);
      setProfile(null);
    }
  }

  function waitForSession(): Promise<Session | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        sessionResolveRef.current = null;
        console.warn('[auth] waitForSession timed out after 5s');
        resolve(null);
      }, 5000);
      sessionResolveRef.current = (s) => {
        clearTimeout(timeout);
        resolve(s);
      };
    });
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('[auth] getSession error:', error.message);
        setLoading(false);
        return;
      }
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!mounted) return;
      setSession(sess);
      if (sessionResolveRef.current) {
        sessionResolveRef.current(sess);
        sessionResolveRef.current = null;
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
        return;
      }
      if (sess) {
        setLoading(true);
        (async () => {
          await loadProfile(sess.user.id);
          if (mounted) setLoading(false);
        })();
      } else if (event === 'INITIAL_SESSION') {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
    if (session?.user.id) await loadProfile(session.user.id);
  }

  // Live-sync own profile when it changes elsewhere (avatar, banner, bio, etc.)
  useRealtime<Profile>({
    table: 'profiles',
    filter: session?.user.id ? `id=eq.${session.user.id}` : undefined,
    onEvent: ({ eventType, new: row }) => {
      if (eventType === 'DELETE') setProfile(null);
      else if (row) setProfile((prev) => (prev && prev.id === row.id ? { ...prev, ...row } : prev));
    },
  });

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      profile,
      loading,
      refreshProfile,
      signIn: async (email, password) => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error('[auth] signIn error:', error.message);
          setLoading(false);
          return { error: error.message };
        }
        await waitForSession();
        return { error: null };
      },
      signUp: async (email, password, username) => {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: username } },
        });
        if (error) {
          console.error('[auth] signUp error:', error.message);
          setLoading(false);
          return { error: error.message };
        }
        if (data.user) {
          await supabase
            .from('profiles')
            .update({ username })
            .eq('id', data.user.id);
        }
        setLoading(false);
        return { error: null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
      },
    }),
    [session, profile, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
