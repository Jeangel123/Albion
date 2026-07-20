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

    // getSession() is the sole driver of the initial loading state. Add a
    // timeout so a hung getSession() can't leave the app in loading forever.
    let settled = false;
    const sessionTimeout = setTimeout(() => {
      if (settled || !mounted) return;
      console.warn('[auth] getSession timed out after 8s — unblocking UI');
      settled = true;
      if (mounted) setLoading(false);
    }, 8000);

    supabase.auth.getSession().then(({ data, error }) => {
      if (settled || !mounted) return;
      settled = true;
      clearTimeout(sessionTimeout);
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
      // INITIAL_SESSION is redundant — getSession() is the sole driver of the
      // initial session + loading state. Do NOT set loading=false here: that
      // would ungate the UI before getSession() has set the session, causing the
      // logged-out Navbar to flash (or persist) on reload.
      if (event === 'INITIAL_SESSION') return;
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
      } else {
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
        // onAuthStateChange('SIGNED_IN') will fire, set the session, load the
        // profile, and clear loading. Wait for that to complete so the caller
        // (Auth.tsx) navigates only after the session is established.
        await waitForSession();
        setLoading(false);
        return { error: null };
      },
      signUp: async (email, password, username) => {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username, display_name: username } },
        });
        if (error) {
          console.error('[auth] signUp error:', error.message);
          setLoading(false);
          return { error: error.message };
        }
        // The handle_new_user() trigger creates the profile row from user
        // metadata (username + display_name). No client-side insert/update is
        // needed — and none would work here anyway since there is no session
        // yet, so RLS would silently block it.
        void data;
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
