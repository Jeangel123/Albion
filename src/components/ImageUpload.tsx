import { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase, STORAGE_BUCKET } from '../lib/supabase';
import { useToast } from './Toast';

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  /** 'avatar' (cuadrado/redondo) o 'banner' (panorámico) */
  variant?: 'avatar' | 'banner';
  /** Carpeta dentro del bucket, ej: 'avatars', 'banners', 'guilds' */
  folder: string;
  /** Id del dueño (perfil/gremio/alianza) para aislar archivos */
  ownerId: string;
  className?: string;
};

const MAX_BYTES = 4 * 1024 * 1024; // 4MB

export function ImageUpload({
  value,
  onChange,
  label,
  variant = 'avatar',
  folder,
  ownerId,
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { push } = useToast();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      push({ type: 'error', message: 'El archivo debe ser una imagen' });
      return;
    }
    if (file.size > MAX_BYTES) {
      push({ type: 'error', message: 'La imagen no puede pesar más de 4MB' });
      return;
    }

    setUploading(true);
    try {
      // Borrar el anterior si existía y era nuestro
      if (value) {
        try {
          const oldPath = extractPath(value);
          if (oldPath) await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
        } catch {
          /* noop: si no se puede borrar el viejo, seguimos */
        }
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${folder}/${ownerId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      push({ type: 'success', message: 'Imagen subida' });
    } catch (err: any) {
      push({ type: 'error', message: err?.message || 'Error al subir la imagen' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function remove() {
    onChange(null);
  }

  const isAvatar = variant === 'avatar';
  const boxCls = isAvatar
    ? 'h-24 w-24 rounded-full'
    : 'h-32 w-full rounded-xl';

  return (
    <div className={className}>
      <label className="label">{label}</label>
      <div className="flex items-start gap-3">
        <div className={`relative overflow-hidden bg-ink-100 dark:bg-ink-800 ${boxCls}`}>
          {value ? (
            <>
              <img src={value} alt={label} className="h-full w-full object-cover" />
              {!uploading && (
                <button
                  type="button"
                  onClick={remove}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  aria-label="Quitar imagen"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-400">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            </div>
          )}
        </div>
        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            className="block w-full text-sm text-ink-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gold-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-gold-600"
          />
          <p className="mt-1 text-xs text-ink-400">PNG, JPG o WEBP — máx. 4MB</p>
        </div>
      </div>
    </div>
  );
}

function extractPath(url: string): string | null {
  try {
    const u = new URL(url);
    const idx = u.pathname.indexOf(`/object/public/${STORAGE_BUCKET}/`);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + `/object/public/${STORAGE_BUCKET}/`.length));
  } catch {
    return null;
  }
}
