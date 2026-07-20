/*
# Create imperio storage bucket for user-uploaded images

## Resumen
Crea el bucket de almacenamiento `imperio` (público) para subir fotos de perfil,
banners, avatares y banners de gremios y alianzas desde el dispositivo del usuario.
Reemplaza los campos de URL obligatorios por subida de archivos.

## Cambios
1. Nuevo bucket `imperio` (public = true) para servir imágenes vía URL pública.
2. Políticas RLS sobre `storage.objects`:
   - SELECT público (cualquiera, incluyendo anónimo, puede leer las imágenes).
   - INSERT: cualquier usuario autenticado puede subir un objeto a `imperio`.
   - UPDATE: el dueño del objeto (auth.uid() = owner) puede actualizar el suyo.
   - DELETE: el dueño del objeto puede eliminar el suyo.
3. Mantiene el esquema existente de profiles/guilds/alliances sin cambios —
   las columnas avatar_url/banner_url siguen almacenando la URL pública
   generada por Supabase Storage tras la subida.

## Notas de seguridad
- El bucket es público en lectura para que las imágenes se rendericen sin token.
- Las escrituras (subida/borrado) requieren sesión autenticada.
- Cada usuario puede gestionar solo los objetos que él subió (owner = auth.uid()).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('imperio', 'imperio', true)
ON CONFLICT (id) DO NOTHING;

-- SELECT público: cualquiera puede leer las imágenes del bucket imperio
DROP POLICY IF EXISTS "imperio_storage_select_all" ON storage.objects;
CREATE POLICY "imperio_storage_select_all" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'imperio');

-- INSERT: cualquier autenticado puede subir archivos al bucket imperio
DROP POLICY IF EXISTS "imperio_storage_insert_own" ON storage.objects;
CREATE POLICY "imperio_storage_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imperio');

-- UPDATE: el dueño puede actualizar sus propios objetos
DROP POLICY IF EXISTS "imperio_storage_update_own" ON storage.objects;
CREATE POLICY "imperio_storage_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'imperio' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'imperio' AND owner = auth.uid());

-- DELETE: el dueño puede borrar sus propios objetos
DROP POLICY IF EXISTS "imperio_storage_delete_own" ON storage.objects;
CREATE POLICY "imperio_storage_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'imperio' AND owner = auth.uid());
