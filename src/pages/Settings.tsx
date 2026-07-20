import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, LogOut, User as UserIcon, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { Spinner } from '../components/ui';

export default function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: profile?.username ?? '',
    display_name: profile?.display_name ?? '',
    bio: profile?.bio ?? '',
    avatar_url: profile?.avatar_url ?? '',
    banner_url: profile?.banner_url ?? '',
    custom_link: profile?.custom_link ?? '',
    discord: profile?.discord ?? '',
    instagram: profile?.instagram ?? '',
    facebook: profile?.facebook ?? '',
    youtube: profile?.youtube ?? '',
    twitch: profile?.twitch ?? '',
  });
  const [saving, setSaving] = useState(false);

  if (!profile) return <Spinner className="py-20" />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', profile!.id);
    setSaving(false);
    if (error) return push({ type: 'error', message: error.message });
    await refreshProfile();
    push({ type: 'success', message: 'Perfil actualizado' });
    navigate(`/perfil/${form.username || profile!.username}`);
  }

  return (
    <div className="container-app max-w-2xl py-6">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-900 dark:text-white">Ajustes</h1>
      <form onSubmit={save} className="card space-y-5 p-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
            {form.avatar_url ? <img src={form.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserIcon className="m-auto mt-6 h-8 w-8 text-ink-400" />}
          </div>
          <div className="flex-1">
            <label className="label"><ImageIcon className="inline h-3.5 w-3.5" /> Foto de perfil (URL)</label>
            <input className="input" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <div>
          <label className="label">Banner (URL)</label>
          <input className="input" value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="https://..." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Nombre de usuario</label><input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div><label className="label">Nombre visible</label><input className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
        </div>
        <div><label className="label">Biografía</label><textarea rows={3} className="input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        <div><label className="label">Enlace personalizado</label><input className="input" value={form.custom_link} onChange={(e) => setForm({ ...form, custom_link: e.target.value })} placeholder="https://..." /></div>
        <div className="border-t border-ink-100 pt-4 dark:border-ink-800">
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400">Redes sociales</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Discord</label><input className="input" value={form.discord} onChange={(e) => setForm({ ...form, discord: e.target.value })} /></div>
            <div><label className="label">Instagram</label><input className="input" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></div>
            <div><label className="label">Facebook</label><input className="input" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} /></div>
            <div><label className="label">YouTube</label><input className="input" value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} /></div>
            <div><label className="label">Twitch</label><input className="input" value={form.twitch} onChange={(e) => setForm({ ...form, twitch: e.target.value })} /></div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => { signOut(); navigate('/'); }} className="btn-ghost text-red-600"><LogOut className="h-4 w-4" /> Cerrar sesión</button>
          <button disabled={saving} className="btn-primary"><Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}
