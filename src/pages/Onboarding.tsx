import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { setUserInterests } from '../lib/gamification';
import { INTEREST_OPTIONS } from '../lib/types';

export default function OnboardingPage() {
  const { profile, refreshProfile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggle(key: string) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  async function finish() {
    if (!profile) return navigate('/login');
    setSaving(true);
    const ok = await setUserInterests(profile.id, selected);
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', profile.id);
    await refreshProfile();
    setSaving(false);
    if (!ok) return push({ type: 'error', message: 'No se pudieron guardar los intereses' });
    push({ type: 'success', message: '¡Bienvenido al Imperio!' });
    navigate('/');
  }

  return (
    <div className="container-app max-w-2xl py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-100 to-gold-50 dark:from-gold-950 dark:to-ink-900">
          <Sparkles className="h-8 w-8 text-gold-500" />
        </div>
        <h1 className="font-display text-3xl font-bold text-ink-900 dark:text-white">Bienvenido al Imperio</h1>
        <p className="mt-2 text-sm text-ink-500">
          Elige tus intereses para recibir recomendaciones de comunidades y gremios afines.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {INTEREST_OPTIONS.map((opt) => {
          const active = selected.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              className={`relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all ${
                active
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-ink-200 hover:border-blue-300 dark:border-ink-700 dark:hover:border-blue-700'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-5`} />
              <div className="relative flex items-center gap-3">
                <span className="text-3xl">{opt.emoji}</span>
                <div className="flex-1">
                  <p className="font-display font-semibold text-ink-900 dark:text-white">{opt.label}</p>
                </div>
                {active && <Check className="h-5 w-5 text-blue-500" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between gap-3">
        <button onClick={() => navigate('/')} className="btn-ghost">Omitir</button>
        <button onClick={finish} disabled={saving || selected.length === 0} className="btn-primary">
          {saving ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
