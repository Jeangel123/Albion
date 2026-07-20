import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { AuthShell } from './Auth';

export default function ResetPasswordPage() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      return push({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres' });
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return push({ type: 'error', message: error.message });
    push({ type: 'success', message: 'Contraseña actualizada. Inicia sesión.' });
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  return (
    <AuthShell title="Nueva contraseña" subtitle="Define una nueva contraseña para tu cuenta">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Nueva contraseña</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
