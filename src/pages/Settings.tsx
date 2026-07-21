import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, LogOut, Globe } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { Spinner } from '../components/ui';
import { ImageUpload } from '../components/ImageUpload';
import { LOCALES, type Locale } from '../lib/i18n/translations';

export default function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const { push } = useToast();
  const { t, locale, setLocale } = useI18n();
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
    language: (profile?.language as Locale) ?? 'es',
  });
  const [saving, setSaving] = useState(false);

  if (!profile) return <Spinner className="py-20" />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', profile!.id);
    setSaving(false);
    if (error) return push({ type: 'error', message: error.message });
    setLocale(form.language as Locale);
    await refreshProfile();
    push({ type: 'success', message: t('settings.saved') });
    navigate(`/perfil/${form.username || profile!.username}`);
  }

  return (
    <div className="container-app max-w-2xl py-6">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-900 dark:text-white">{t('settings.title')}</h1>
      <form onSubmit={save} className="card space-y-5 p-5">
        <ImageUpload
          label={t('settings.avatar')}
          variant="avatar"
          folder="avatars"
          ownerId={profile!.id}
          value={form.avatar_url}
          onChange={(url) => setForm({ ...form, avatar_url: url ?? '' })}
        />
        <ImageUpload
          label={t('settings.banner')}
          variant="banner"
          folder="banners"
          ownerId={profile!.id}
          value={form.banner_url}
          onChange={(url) => setForm({ ...form, banner_url: url ?? '' })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">{t('settings.username')}</label><input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div><label className="label">{t('settings.displayName')}</label><input className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
        </div>
        <div><label className="label">{t('settings.bio')}</label><textarea rows={3} className="input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        <div><label className="label">{t('settings.customLink')}</label><input className="input" value={form.custom_link} onChange={(e) => setForm({ ...form, custom_link: e.target.value })} placeholder="https://..." /></div>
        <div className="border-t border-ink-100 pt-4 dark:border-ink-800">
          <p className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400">{t('settings.social')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">{t('settings.discord')}</label><input className="input" value={form.discord} onChange={(e) => setForm({ ...form, discord: e.target.value })} /></div>
            <div><label className="label">{t('settings.instagram')}</label><input className="input" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></div>
            <div><label className="label">{t('settings.facebook')}</label><input className="input" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} /></div>
            <div><label className="label">{t('settings.youtube')}</label><input className="input" value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} /></div>
            <div><label className="label">{t('settings.twitch')}</label><input className="input" value={form.twitch} onChange={(e) => setForm({ ...form, twitch: e.target.value })} /></div>
          </div>
        </div>
        <div className="border-t border-ink-100 pt-4 dark:border-ink-800">
          <label className="label flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> {t('settings.language')}</label>
          <p className="mb-2 text-xs text-ink-500">{t('settings.languageHint')}</p>
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setForm({ ...form, language: l.key })}
                className={`chip transition ${form.language === l.key ? 'bg-blue-500 text-white shadow-sm' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300'}`}
              >
                <span className="text-base">{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => { signOut(); navigate('/'); }} className="btn-ghost text-red-600"><LogOut className="h-4 w-4" /> {t('settings.logout')}</button>
          <button disabled={saving} className="btn-primary"><Save className="h-4 w-4" /> {saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </div>
  );
}
