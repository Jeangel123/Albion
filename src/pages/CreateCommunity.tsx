import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Castle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { useCommunities } from '../lib/useCommunities';
import { supabase } from '../lib/supabase';
import { ImageUpload } from '../components/ImageUpload';
import { slugify } from '../lib/format';
import { COMMUNITY_CATEGORIES } from '../lib/types';

export default function CreateCommunityPage() {
  const { profile } = useAuth();
  const { push } = useToast();
  const { create } = useCommunities();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'general',
    avatar_url: '',
    banner_url: '',
  });
  const [loading, setLoading] = useState(false);

  if (!profile) {
    navigate('/login');
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return push({ type: 'error', message: 'El nombre es obligatorio' });
    setLoading(true);
    const slug = slugify(form.name) + '-' + Math.random().toString(36).slice(2, 6);
    const { error, data } = await create({
      name: form.name.trim(),
      slug,
      description: form.description.trim() || undefined,
      category: form.category,
      avatar_url: form.avatar_url || undefined,
      banner_url: form.banner_url || undefined,
    });
    setLoading(false);
    if (error) return push({ type: 'error', message: error });
    push({ type: 'success', message: 'Comunidad creada' });
    if (data) {
      await supabase.from('community_members').insert({ community_id: data.id, user_id: profile!.id, role: 'owner' });
      // The chat_room is auto-created by the create_chat_room_for_community trigger.
      // Just add the owner as a member of that room.
      await supabase.from('chat_room_members').upsert({ room_id: data.id, user_id: profile!.id }, { onConflict: 'room_id,user_id' });
      navigate(`/comunidad/${data.slug}`);
    }
  }

  return (
    <div className="container-app max-w-2xl py-6">
      <div className="mb-6 flex items-center gap-2">
        <Castle className="h-6 w-6 text-gold-500" />
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Crear comunidad</h1>
      </div>
      <form onSubmit={submit} className="card space-y-4 p-5">
        <div>
          <label className="label">Nombre *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: PvP Ibérico" />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea
            rows={3}
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="¿De qué trata esta comunidad?"
          />
        </div>
        <div>
          <label className="label">Categoría</label>
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {COMMUNITY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <ImageUpload
          label="Avatar"
          variant="avatar"
          folder="communities"
          ownerId={profile.id}
          value={form.avatar_url || null}
          onChange={(url) => setForm({ ...form, avatar_url: url ?? '' })}
        />
        <ImageUpload
          label="Banner"
          variant="banner"
          folder="communities"
          ownerId={profile.id}
          value={form.banner_url || null}
          onChange={(url) => setForm({ ...form, banner_url: url ?? '' })}
        />
        <button disabled={loading} className="btn-primary w-full">
          {loading ? 'Creando...' : 'Crear comunidad'}
        </button>
      </form>
    </div>
  );
}
