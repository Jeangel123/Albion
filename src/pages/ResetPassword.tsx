import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { AuthShell } from './Auth';

export default function ResetPasswordPage() {
  const { push } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      return push({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres' });
    }
    if (password !== confirm) {
      return push({ type: 'error', message: 'Las contraseñas no coinciden' });
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('token') || msg.toLowerCase().includes('session')) {
        return push({ type: 'error', message: 'El enlace ha expirado. Solicita uno nuevo.' });
      }
      return push({ type: 'error', message: msg });
    }
    setDone(true);
    await supabase.auth.signOut();
  }

  if (done) {
    return (
      <AuthShell title="Contraseña actualizada" subtitle="Tu cuenta está protegida de nuevo">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
            <CheckCircle2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Tu contraseña se cambió correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <Link to="/login" className="btn-primary mt-6 w-full">Ir a iniciar sesión</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nueva contraseña" subtitle="Define una nueva contraseña para tu cuenta">
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Si el enlace expiró, solicita uno nuevo desde la pantalla de recuperación.</span>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Nueva contraseña</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type={show ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-10 pr-10"
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShow((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="label">Confirmar contraseña</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type={show ? 'text' : 'password'}
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input pl-10"
              placeholder="••••••••"
            />
          </div>
        </div>
        <button disabled={loading} className="btn-primary w-full">
          {loading ? 'Guardando...' : 'Actualizar contraseña'}
        </button>
      </form>
    </AuthShell>
  );
}
