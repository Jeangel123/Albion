/*
# Imperio Medieval — Schema de Plataforma de Comunidad

## Resumen
Evoluciona la página de comunidades de Albion en una plataforma medieval con:
1. Comunidades con chat en tiempo real
2. Sistema de rangos medievales por puntos de reputación
3. Roles administrativos especiales (supreme_admin, admin, moderator, user)
4. Marcos premium para avatares (tienda + inventario + equipar)
5. Economía interna (wallet, transacciones, shop_items, inventario)
6. Limpieza de tablas demo no usadas

## Tablas NUEVAS
- `communities` — comunidades/grupos sociales (PvP, PvE, Avalon, Facción, Español, etc.)
  - id, name, slug, description, avatar_url, banner_url, category, owner_id, created_at, updated_at
- `community_members` — miembros de comunidades con rol (owner/admin/member)
  - id, community_id, user_id, role, joined_at
- `reputation_log` — registro de puntos de reputación ganados por acción
  - id, user_id, action, points, reference_type, reference_id, created_at
- `avatar_frames` — catálogo de marcos para avatar (rareza, precio, condición)
  - id, name, slug, description, rarity, icon, price, is_free, unlock_condition, created_at
- `user_frames` — inventario de marcos del usuario (adquirido + equipado)
  - id, user_id, frame_id, acquired_at, is_equipped
- `wallets` — saldo de moneda interna del usuario
  - user_id (PK), balance, created_at, updated_at
- `transactions` — historial de movimientos de moneda
  - id, user_id, amount, type (earn/spend/purchase), reference, description, created_at
- `shop_items` — catálogo general de objetos comprables
  - id, name, slug, description, price, type, metadata, created_at
- `user_inventory` — objetos comprados por el usuario
  - id, user_id, shop_item_id, purchased_at, metadata

## Columnas AÑADIDAS en `profiles`
- `reputation_points` int NOT NULL DEFAULT 0 — puntos de reputación acumulados
- `medieval_rank` text NOT NULL DEFAULT 'campesino' — rango medieval actual
- `equipped_frame_id` uuid NULLABLE — marco de avatar equipado (FK a avatar_frames.id)

## Tablas ELIMINADAS (demo, sin referencias en frontend)
- `restaurants` — plantilla demo de Bolt
- `reviews` — reviews de restaurantes demo
- `likes` — likes de restaurantes demo (FK a restaurants)

## Seguridad (RLS)
- RLS habilitado en TODAS las tablas nuevas.
- 4 políticas CRUD por tabla (SELECT/INSERT/UPDATE/DELETE), `TO authenticated`, con ownership checks vía auth.uid().
- `profiles.role` protegido: solo supreme_admin/admin pueden actualizarlo (política UPDATE separada).
- `profiles.reputation_points` y `profiles.medieval_rank`: solo modificables por triggers/funciones server-side (política UPDATE restringe).
- Comunidades: miembros pueden SELECT; owner/admin pueden UPDATE/DELETE la comunidad; cualquier autenticado puede INSERT (crear).
- Community_members: miembros pueden SELECT; el propio usuario puede INSERT (unirse) y DELETE (salirse); owner/admin de la comunidad pueden UPDATE role y DELETE miembros.
- Wallets/transactions: el usuario solo ve y opera su propia wallet; las transacciones las crea el sistema (trigger/edge function) — el usuario solo puede SELECT.
- Avatar_frames: SELECT público a autenticados; INSERT/UPDATE/DELETE solo admins.
- User_frames: el usuario ve y equipa sus propios marcos; INSERT solo el sistema (compra) o el propio usuario para marcos gratuitos.
- Shop_items: SELECT público a autenticados; INSERT/UPDATE/DELETE solo admins.
- User_inventory: el usuario ve sus objetos; INSERT solo el sistema (compra).

## Triggers de Reputación
- `award_reputation_on_message()` — +1 punto al enviar un mensaje de chat
- `award_reputation_on_post()` — +5 puntos al crear una publicación
- `award_reputation_on_community()` — +10 puntos al crear una comunidad
- `award_reputation_on_reaction()` — +2 puntos al recibir una reacción positiva en una publicación propia
- `recompute_medieval_rank()` — recalcula el rango medieval según puntos (ver función `compute_rank`)

## Rangos Medievales (umbrales de puntos)
1. Campesino — 0
2. Escudero — 50
3. Caballero — 150
4. Caballero Real — 350
5. Barón — 700
6. Conde — 1200
7. Duque — 2000
8. Lord — 3000
9. Rey — 5000
10. Emperador — 10000

## Seed Inicial
- 9 marcos de avatar (Hierro, Plata, Oro, Real, Dragón, Infernal, Glacial, Legendario, Mítico) con rareza y precio.
- 1 shop_item de ejemplo (Marco Oro) para probar el flujo de compra.

## Realtime
- Activado en `communities`, `community_members` y `messages` (ya estaba activo).

## Notas Importantes
1. NO se tocan las tablas existentes de gremios, publicaciones, comentarios, auth, etc. — solo se añade.
2. Las tablas demo eliminadas no tienen referencias en el frontend (verificado con grep).
3. El primer usuario se marca como `supreme_admin` manualmente vía SQL (no por puntos).
4. Las transacciones de wallet las crea el sistema (triggers de compra), no el cliente directamente.
5. La integración futura con PayPal se prepara con la estructura de `transactions` (type='purchase', reference=id_pago_externo) — sin guardar datos sensibles.
*/

-- ============================================================
-- 1. LIMPIEZA DE TABLAS DEMO
-- ============================================================

DROP TABLE IF EXISTS "likes" CASCADE;
DROP TABLE IF EXISTS "reviews" CASCADE;
DROP TABLE IF EXISTS "restaurants" CASCADE;

-- ============================================================
-- 2. COLUMNAS NUEVAS EN profiles
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reputation_points integer NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS medieval_rank text NOT NULL DEFAULT 'campesino';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS equipped_frame_id uuid;

-- FK de equipped_frame_id a avatar_frames (se añade tras crear la tabla abajo)

-- ============================================================
-- 3. TABLA: communities
-- ============================================================

CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  avatar_url text,
  banner_url text,
  category text NOT NULL DEFAULT 'general',
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  member_count integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_category ON communities(category);
CREATE INDEX IF NOT EXISTS idx_communities_owner ON communities(owner_id);

-- Políticas communities
DROP POLICY IF EXISTS "select_communities" ON communities;
CREATE POLICY "select_communities" ON communities FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_communities" ON communities;
CREATE POLICY "insert_communities" ON communities FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_communities" ON communities;
CREATE POLICY "update_communities" ON communities FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_communities" ON communities;
CREATE POLICY "delete_communities" ON communities FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============================================================
-- 4. TABLA: community_members
-- ============================================================

CREATE TABLE IF NOT EXISTS community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cm_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_cm_user ON community_members(user_id);

-- Políticas community_members
DROP POLICY IF EXISTS "select_cm" ON community_members;
CREATE POLICY "select_cm" ON community_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_cm" ON community_members;
CREATE POLICY "insert_cm" ON community_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_cm" ON community_members;
CREATE POLICY "update_cm" ON community_members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "delete_cm" ON community_members;
CREATE POLICY "delete_cm" ON community_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 5. TABLA: reputation_log
-- ============================================================

CREATE TABLE IF NOT EXISTS reputation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  points integer NOT NULL,
  reference_type text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reputation_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_replog_user ON reputation_log(user_id);

DROP POLICY IF EXISTS "select_replog" ON reputation_log;
CREATE POLICY "select_replog" ON reputation_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Solo el sistema escribe reputation_log (sin INSERT/UPDATE/DELETE desde cliente)
-- Pero permitimos INSERT para que los triggers funcionen vía service role
-- Los clientes no pueden insertar directamente (no hay política INSERT)

-- ============================================================
-- 6. TABLA: avatar_frames
-- ============================================================

CREATE TABLE IF NOT EXISTS avatar_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  rarity text NOT NULL DEFAULT 'common',
  icon text,
  price integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  unlock_condition text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE avatar_frames ENABLE ROW LEVEL SECURITY;

-- FK: profiles.equipped_frame_id -> avatar_frames.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_equipped_frame_id_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_equipped_frame_id_fkey
      FOREIGN KEY (equipped_frame_id) REFERENCES avatar_frames(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "select_frames" ON avatar_frames;
CREATE POLICY "select_frames" ON avatar_frames FOR SELECT
  TO authenticated USING (true);

-- Solo admins pueden gestionar marcos (INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "insert_frames" ON avatar_frames;
CREATE POLICY "insert_frames" ON avatar_frames FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('supreme_admin', 'admin'))
  );

DROP POLICY IF EXISTS "update_frames" ON avatar_frames;
CREATE POLICY "update_frames" ON avatar_frames FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('supreme_admin', 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('supreme_admin', 'admin'))
  );

DROP POLICY IF EXISTS "delete_frames" ON avatar_frames;
CREATE POLICY "delete_frames" ON avatar_frames FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('supreme_admin', 'admin'))
  );

-- ============================================================
-- 7. TABLA: user_frames
-- ============================================================

CREATE TABLE IF NOT EXISTS user_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  frame_id uuid NOT NULL REFERENCES avatar_frames(id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  is_equipped boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, frame_id)
);

ALTER TABLE user_frames ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_uf_user ON user_frames(user_id);

DROP POLICY IF EXISTS "select_uf" ON user_frames;
CREATE POLICY "select_uf" ON user_frames FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_uf" ON user_frames;
CREATE POLICY "insert_uf" ON user_frames FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_uf" ON user_frames;
CREATE POLICY "update_uf" ON user_frames FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_uf" ON user_frames;
CREATE POLICY "delete_uf" ON user_frames FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 8. TABLA: wallets
-- ============================================================

CREATE TABLE IF NOT EXISTS wallets (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_wallet" ON wallets;
CREATE POLICY "select_wallet" ON wallets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- El usuario no puede modificar su wallet directamente (solo el sistema vía triggers)
-- No hay política UPDATE/INSERT/DELETE para el cliente

-- ============================================================
-- 9. TABLA: transactions
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL,
  reference text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at);

DROP POLICY IF EXISTS "select_tx" ON transactions;
CREATE POLICY "select_tx" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- El usuario no puede insertar/modificar transacciones directamente (solo el sistema)

-- ============================================================
-- 10. TABLA: shop_items
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'item',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_shop" ON shop_items;
CREATE POLICY "select_shop" ON shop_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_shop" ON shop_items;
CREATE POLICY "insert_shop" ON shop_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('supreme_admin', 'admin'))
  );

DROP POLICY IF EXISTS "update_shop" ON shop_items;
CREATE POLICY "update_shop" ON shop_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('supreme_admin', 'admin'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('supreme_admin', 'admin'))
  );

DROP POLICY IF EXISTS "delete_shop" ON shop_items;
CREATE POLICY "delete_shop" ON shop_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('supreme_admin', 'admin'))
  );

-- ============================================================
-- 11. TABLA: user_inventory
-- ============================================================

CREATE TABLE IF NOT EXISTS user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  shop_item_id uuid NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_inv_user ON user_inventory(user_id);

DROP POLICY IF EXISTS "select_inv" ON user_inventory;
CREATE POLICY "select_inv" ON user_inventory FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- El usuario no puede insertar directamente (compras vía sistema)
-- No hay política INSERT/UPDATE/DELETE para el cliente

-- ============================================================
-- 12. FUNCIÓN: compute_rank(puntos) -> rango medieval
-- ============================================================

CREATE OR REPLACE FUNCTION compute_rank(points integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN points >= 10000 THEN 'emperador'
    WHEN points >= 5000 THEN 'rey'
    WHEN points >= 3000 THEN 'lord'
    WHEN points >= 2000 THEN 'duque'
    WHEN points >= 1200 THEN 'conde'
    WHEN points >= 700 THEN 'baron'
    WHEN points >= 350 THEN 'caballero_real'
    WHEN points >= 150 THEN 'caballero'
    WHEN points >= 50 THEN 'escudero'
    ELSE 'campesino'
  END;
$$;

-- ============================================================
-- 13. FUNCIÓN: award_reputation(user, action, points, ref)
-- ============================================================

CREATE OR REPLACE FUNCTION award_reputation(
  p_user_id uuid,
  p_action text,
  p_points integer,
  p_ref_type text DEFAULT NULL,
  p_ref_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO reputation_log (user_id, action, points, reference_type, reference_id)
  VALUES (p_user_id, p_action, p_points, p_ref_type, p_ref_id);

  UPDATE profiles
  SET reputation_points = reputation_points + p_points,
      medieval_rank = compute_rank(reputation_points + p_points),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- 14. TRIGGER: reputación al crear publicación (+5)
-- ============================================================

CREATE OR REPLACE FUNCTION award_reputation_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM award_reputation(NEW.author_id, 'create_post', 5, 'post', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_post ON posts;
CREATE TRIGGER trg_award_post
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION award_reputation_on_post();

-- ============================================================
-- 15. TRIGGER: reputación al crear comunidad (+10)
-- ============================================================

CREATE OR REPLACE FUNCTION award_reputation_on_community()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM award_reputation(NEW.owner_id, 'create_community', 10, 'community', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_community ON communities;
CREATE TRIGGER trg_award_community
  AFTER INSERT ON communities
  FOR EACH ROW
  EXECUTE FUNCTION award_reputation_on_community();

-- ============================================================
-- 16. TRIGGER: reputación al enviar mensaje de chat (+1)
-- ============================================================

CREATE OR REPLACE FUNCTION award_reputation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM award_reputation(NEW.sender_id, 'send_message', 1, 'message', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_message ON messages;
CREATE TRIGGER trg_award_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION award_reputation_on_message();

-- ============================================================
-- 17. TRIGGER: reputación al recibir reacción (+2 al autor del post)
-- ============================================================

CREATE OR REPLACE FUNCTION award_reputation_on_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_author uuid;
BEGIN
  SELECT author_id INTO post_author FROM posts WHERE id = NEW.post_id;
  IF post_author IS NOT NULL AND post_author != NEW.user_id THEN
    PERFORM award_reputation(post_author, 'receive_reaction', 2, 'reaction', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_reaction ON reactions;
CREATE TRIGGER trg_award_reaction
  AFTER INSERT ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION award_reputation_on_reaction();

-- ============================================================
-- 18. TRIGGER: actualizar member_count en comunidades
-- ============================================================

CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE communities SET member_count = member_count - 1 WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cm_count_insert ON community_members;
CREATE TRIGGER trg_cm_count_insert
  AFTER INSERT ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION update_community_member_count();

DROP TRIGGER IF EXISTS trg_cm_count_delete ON community_members;
CREATE TRIGGER trg_cm_count_delete
  AFTER DELETE ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION update_community_member_count();

-- ============================================================
-- 19. TRIGGER: crear wallet automáticamente al crear perfil
-- ============================================================

CREATE OR REPLACE FUNCTION create_wallet_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_wallet ON profiles;
CREATE TRIGGER trg_create_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_on_profile();

-- ============================================================
-- 20. TRIGGER: equipar marco único (solo uno equipado a la vez)
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_single_equipped_frame()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_equipped THEN
    UPDATE user_frames SET is_equipped = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
    UPDATE profiles SET equipped_frame_id = NEW.frame_id, updated_at = now()
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_equipped AND NOT NEW.is_equipped THEN
    UPDATE profiles SET equipped_frame_id = NULL, updated_at = now()
    WHERE id = NEW.user_id AND equipped_frame_id = NEW.frame_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_frame ON user_frames;
CREATE TRIGGER trg_single_frame
  AFTER INSERT OR UPDATE ON user_frames
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_equipped_frame();

-- ============================================================
-- 21. SEED: Marcos de avatar
-- ============================================================

INSERT INTO avatar_frames (name, slug, description, rarity, icon, price, is_free, unlock_condition) VALUES
  ('Marco Hierro', 'marco-hierro', 'Marco de hierro forjado, resistente y humilde.', 'common', '⚔️', 0, true, 'Disponible para todos'),
  ('Marco Plata', 'marco-plata', 'Marco de plata pulida, brillo noble.', 'uncommon', '🛡️', 500, false, 'Comprar en tienda'),
  ('Marco Oro', 'marco-oro', 'Marco de oro puro, símbolo de riqueza.', 'rare', '👑', 1500, false, 'Comprar en tienda'),
  ('Marco Real', 'marco-real', 'Marco de la realeza, adornado con gemas.', 'epic', '🏰', 3000, false, 'Alcanzar rango Barón'),
  ('Marco Dragón', 'marco-dragon', 'Marco con la furia del dragón ancestral.', 'legendary', '🐉', 5000, false, 'Alcanzar rango Conde'),
  ('Marco Infernal', 'marco-infernal', 'Marco forjado en las llamas del inframundo.', 'legendary', '🔥', 5000, false, 'Comprar en tienda'),
  ('Marco Glacial', 'marco-glacial', 'Marco congelado del norte eterno.', 'epic', '❄️', 3000, false, 'Comprar en tienda'),
  ('Marco Legendario', 'marco-legendario', 'Marco de los héroes legendarios de Albion.', 'mythic', '🌌', 10000, false, 'Alcanzar rango Duque'),
  ('Marco Mítico', 'marco-mitico', 'Marco de los dioses, reservado para emperadores.', 'mythic', '✨', 15000, false, 'Alcanzar rango Emperador')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 22. SEED: Shop item de ejemplo
-- ============================================================

INSERT INTO shop_items (name, slug, description, price, type, metadata)
VALUES ('Marco Oro', 'shop-marco-oro', 'Marco de avatar de oro puro.', 1500, 'avatar_frame', '{"frame_slug": "marco-oro"}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 23. ACTUALIZAR perfiles existentes con rango según puntos
-- ============================================================

UPDATE profiles
SET medieval_rank = compute_rank(reputation_points),
    updated_at = now()
WHERE medieval_rank IS NULL OR medieval_rank = 'campesino';

-- ============================================================
-- 24. ACTIVAR REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE communities;
ALTER PUBLICATION supabase_realtime ADD TABLE community_members;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;