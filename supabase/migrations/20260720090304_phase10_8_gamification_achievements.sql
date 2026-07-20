/*
# Phase 10.8 — Gamification: Achievements, Interests, Missions

## Purpose
Adds tables for the gamification system and onboarding interests:
- achievements: catalog of medals/achievements users can earn
- user_achievements: per-user earned achievements
- user_interests: per-user interests chosen during onboarding (PvP, PvE, Avalon, Economía, Social)
- community_missions: community missions/tasks for engagement
- user_missions: per-user mission progress

## New Tables
1. achievements (id, slug, name, description, icon, category, requirement, points, created_at)
2. user_achievements (id, user_id, achievement_id, earned_at, metadata)
3. user_interests (id, user_id, interest, created_at) — unique (user_id, interest)
4. community_missions (id, slug, title, description, icon, target_count, reward_coins, reward_rep, is_active, created_at)
5. user_missions (id, user_id, mission_id, progress, completed_at, created_at)

## Security
- RLS enabled on all tables.
- SELECT: authenticated can read catalogs (achievements, community_missions) and own rows.
- INSERT/UPDATE/DELETE: owner-scoped to auth.uid() = user_id.
- user_achievements INSERT is owner-scoped (earned by user action).
*/

-- 1. achievements catalog
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  category text DEFAULT 'general',
  requirement jsonb,
  points integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_achievements" ON achievements;
CREATE POLICY "read_achievements" ON achievements FOR SELECT TO authenticated USING (true);

-- 2. user_achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  metadata jsonb,
  UNIQUE (user_id, achievement_id)
);
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_user_achievements" ON user_achievements;
CREATE POLICY "select_own_user_achievements" ON user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_user_achievements" ON user_achievements;
CREATE POLICY "insert_own_user_achievements" ON user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_user_achievements" ON user_achievements;
CREATE POLICY "delete_own_user_achievements" ON user_achievements FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. user_interests
CREATE TABLE IF NOT EXISTS user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  interest text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, interest)
);
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_interests" ON user_interests;
CREATE POLICY "select_own_interests" ON user_interests FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_interests" ON user_interests;
CREATE POLICY "insert_own_interests" ON user_interests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_interests" ON user_interests;
CREATE POLICY "delete_own_interests" ON user_interests FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. community_missions catalog
CREATE TABLE IF NOT EXISTS community_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  icon text,
  target_count integer DEFAULT 1,
  reward_coins integer DEFAULT 0,
  reward_rep integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE community_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_missions" ON community_missions;
CREATE POLICY "read_missions" ON community_missions FOR SELECT TO authenticated USING (true);

-- 5. user_missions progress
CREATE TABLE IF NOT EXISTS user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES community_missions(id) ON DELETE CASCADE,
  progress integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, mission_id)
);
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_missions" ON user_missions;
CREATE POLICY "select_own_missions" ON user_missions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_missions" ON user_missions;
CREATE POLICY "insert_own_missions" ON user_missions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_missions" ON user_missions;
CREATE POLICY "update_own_missions" ON user_missions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_missions" ON user_missions;
CREATE POLICY "delete_own_missions" ON user_missions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Seed initial achievements
INSERT INTO achievements (slug, name, description, icon, category, points) VALUES
  ('first_guild', 'Primer Gremio', 'Crea tu primer gremio', '🏰', 'gremios', 50),
  ('first_event', 'Primer Evento', 'Organiza tu primer evento', '📅', 'eventos', 50),
  ('first_post', 'Primera Publicación', 'Realiza tu primera publicación', '✍️', 'social', 20),
  ('first_community', 'Primera Comunidad', 'Crea tu primera comunidad', '🏘️', 'comunidades', 50),
  ('kingdom_helper', 'Ayudante del Reino', 'Ayuda a 10 usuarios nuevos', '🤝', 'reino', 100),
  ('veteran', 'Veterano de la Comunidad', 'Cuenta con más de 6 meses de antigüedad', '🎖️', 'reino', 200),
  ('first_suggestion', 'Voz del Consejo', 'Propón tu primera idea al Consejo', '📜', 'consejo', 30),
  ('first_vote', 'Voto del Reino', 'Vota por primera vez en el Consejo', '🗳️', 'consejo', 20),
  ('social_butterfly', 'Mariposa Social', 'Sigue a 20 usuarios', '🦋', 'social', 60),
  ('reputation_baron', 'Ascenso a Barón', 'Alcanza el rango de Barón', '⚜️', 'rangos', 100)
ON CONFLICT (slug) DO NOTHING;

-- Seed initial missions
INSERT INTO community_missions (slug, title, description, icon, target_count, reward_coins, reward_rep) VALUES
  ('daily_post', 'Publicación Diaria', 'Publica al menos una vez hoy', '✍️', 1, 10, 5),
  ('weekly_events', 'Participa en Eventos', 'Únete a 3 eventos esta semana', '📅', 3, 30, 15),
  ('community_join', 'Únete a la Comunidad', 'Únete a 2 comunidades', '🏘️', 2, 20, 10),
  ('council_voice', 'Voz del Consejo', 'Propón 2 ideas al Consejo', '📜', 2, 25, 15)
ON CONFLICT (slug) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id);
