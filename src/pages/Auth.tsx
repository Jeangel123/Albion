import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { Logo } from '../components/Logo';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) return push({ type: 'error', message: error });
    push({ type: 'success', message: 'Bienvenido de vuelta' });
    navigate(from, { replace: true });
  }

  return (
    <AuthShell title="Iniciar sesión" subtitle="Accede a tu cuenta de Imperio">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Correo electrónico</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="tu@correo.com" />
          </div>
        </div>
        <div>
          <label className="label">Contraseña</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input type={show ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10 pr-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShow((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button disabled={loading} className="btn-primary w-full">{loading ? 'Entrando...' : 'Iniciar sesión'}</button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <Link to="/recuperar" className="link-gold">¿Olvidaste tu contraseña?</Link>
        <Link to="/registro" className="link-gold">Crear cuenta</Link>
      </div>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 dark:bg-ink-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="card p-6 sm:p-8 animate-slide-up">
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function SignupPage() {
  const { signUp } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return push({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres' });
    if (username.trim().length < 3) return push({ type: 'error', message: 'El nombre de usuario debe tener al menos 3 caracteres' });
    setLoading(true);
    const { error } = await signUp(email, password, username.trim());
    setLoading(false);
    if (error) {
      // The signUp function already extracted and enriched the error message.
      // Log it for debugging and show the real Supabase error to the user.
      console.error('[signup] error:', error);
      return push({ type: 'error', message: error });
    }
    push({ type: 'success', message: 'Cuenta creada. Revisa tu correo para verificar.' });
    navigate('/login');
  }

  return (
    <AuthShell title="Crear cuenta" subtitle="Únete a la comunidad de Imperio">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Nombre de usuario</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input required value={username} onChange={(e) => setUsername(e.target.value)} className="input pl-10" placeholder="tu_nombre" />
          </div>
        </div>
        <div>
          <label className="label">Correo electrónico</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="tu@correo.com" />
          </div>
        </div>
        <div>
          <label className="label">Contraseña</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10" placeholder="••••••••" />
          </div>
        </div>
        <button disabled={loading} className="btn-primary w-full">{loading ? 'Creando...' : 'Registrarse'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-500 dark:text-ink-400">
        ¿Ya tienes cuenta? <Link to="/login" className="link-gold">Inicia sesión</Link>
      </p>
    </AuthShell>
  );
}

export function RecoverPage() {
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return push({ type: 'error', message: error.message });
    setSent(true);
    push({ type: 'success', message: 'Enlace de recuperación enviado' });
  }

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te enviaremos un enlace a tu correo">
      {sent ? (
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Revisa tu correo <strong>{email}</strong> para restablecer tu contraseña.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Correo electrónico</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="tu@correo.com" />
          </div>
          <button className="btn-primary w-full">Enviar enlace</button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-ink-500 dark:text-ink-400">
        <Link to="/login" className="link-gold">Volver a iniciar sesión</Link>
      </p>
    </AuthShell>
  );
}
