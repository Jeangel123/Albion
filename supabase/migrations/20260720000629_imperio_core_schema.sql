/*
# Imperio - Core Schema

## Resumen
Plataforma social para gremios de Albion Online (comunidad hispanohablante).
Crea el esquema completo: perfiles, gremios, alianzas, publicaciones, comentarios,
reacciones, eventos, notificaciones, seguidores, amigos, reportes, insignias,
galerías, mensajes (chat), y configuración de administración/mantenimiento.

## Tablas nuevas
- profiles, guilds, alliances, guild_members, alliance_members
- posts, poll_options, poll_votes, comments, reactions, saved_posts, shares, reports
- events, event_attendees, notifications, follows, friends
- chat_rooms, chat_room_members, messages
- guild_gallery, guild_videos, badges, user_badges, app_config, audit_log

## Seguridad (RLS)
- RLS habilitado en TODAS las tablas.
- Perfiles: lectura pública, escritura del dueño.
- Gremios/alianzas: lectura pública, escritura del dueño.
- Publicaciones/comentarios/reacciones: lectura pública, escritura del autor.
- Notificaciones/mensajes: solo el dueño lee; cualquier autenticado puede crear.
- Reportes: cualquier autenticado crea; solo admin lee.
- app_config: lectura pública, escritura solo admin (role='admin' en profiles).
*/

-- ===== ALL TABLES FIRST =====

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  banner_url text,
  custom_link text,
  guild_id uuid,
  discord text,
  instagram text,
  facebook text,
  youtube text,
  twitch text,
  is_verified boolean NOT NULL DEFAULT false,
  is_suspended boolean NOT NULL DEFAULT false,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guilds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  avatar_url text,
  banner_url text,
  language text DEFAULT 'Español',
  home_city text,
  activities text[] DEFAULT '{}',
  schedule text,
  requirements text,
  member_count int NOT NULL DEFAULT 1,
  alliance_id uuid,
  discord_url text,
  apply_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  avatar_url text,
  banner_url text,
  discord_url text,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guild_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS alliance_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_id uuid NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  guild_id uuid NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alliance_id, guild_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  guild_id uuid REFERENCES guilds(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'text',
  content text,
  media_urls text[] DEFAULT '{}',
  link_url text,
  is_public boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT true,
  is_pinned boolean NOT NULL DEFAULT false,
  is_news boolean NOT NULL DEFAULT false,
  like_count int NOT NULL DEFAULT 0,
  comment_count int NOT NULL DEFAULT 0,
  share_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  label text NOT NULL,
  vote_count int NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (option_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid REFERENCES guilds(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'zvz',
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  content text,
  target_type text,
  target_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'private',
  name text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guild_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guild_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id uuid NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  color text DEFAULT 'gold'
);

CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS app_config (
  id int PRIMARY KEY DEFAULT 1,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text,
  announcement text,
  announcement_active boolean NOT NULL DEFAULT false,
  community_rules text,
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== ENABLE RLS ON ALL =====
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ===== ALL POLICIES =====

-- profiles
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- guilds
DROP POLICY IF EXISTS "guilds_select_all" ON guilds;
CREATE POLICY "guilds_select_all" ON guilds FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "guilds_insert_own" ON guilds;
CREATE POLICY "guilds_insert_own" ON guilds FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "guilds_update_own" ON guilds;
CREATE POLICY "guilds_update_own" ON guilds FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "guilds_delete_own" ON guilds;
CREATE POLICY "guilds_delete_own" ON guilds FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- alliances
DROP POLICY IF EXISTS "alliances_select_all" ON alliances;
CREATE POLICY "alliances_select_all" ON alliances FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "alliances_insert_own" ON alliances;
CREATE POLICY "alliances_insert_own" ON alliances FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "alliances_update_own" ON alliances;
CREATE POLICY "alliances_update_own" ON alliances FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "alliances_delete_own" ON alliances;
CREATE POLICY "alliances_delete_own" ON alliances FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- guild_members
DROP POLICY IF EXISTS "guild_members_select_all" ON guild_members;
CREATE POLICY "guild_members_select_all" ON guild_members FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "guild_members_insert_own" ON guild_members;
CREATE POLICY "guild_members_insert_own" ON guild_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "guild_members_update_leader" ON guild_members;
CREATE POLICY "guild_members_update_leader" ON guild_members FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_members.guild_id AND gm.user_id = auth.uid() AND gm.role = 'leader')
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_members.guild_id AND gm.user_id = auth.uid() AND gm.role = 'leader')
  );
DROP POLICY IF EXISTS "guild_members_delete_leader_or_self" ON guild_members;
CREATE POLICY "guild_members_delete_leader_or_self" ON guild_members FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_members.guild_id AND gm.user_id = auth.uid() AND gm.role = 'leader')
  );

-- alliance_members
DROP POLICY IF EXISTS "alliance_members_select_all" ON alliance_members;
CREATE POLICY "alliance_members_select_all" ON alliance_members FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "alliance_members_insert_alliance_owner" ON alliance_members;
CREATE POLICY "alliance_members_insert_alliance_owner" ON alliance_members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM alliances a WHERE a.id = alliance_id AND a.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM guilds g WHERE g.id = guild_id AND g.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "alliance_members_delete_alliance_owner" ON alliance_members;
CREATE POLICY "alliance_members_delete_alliance_owner" ON alliance_members FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM alliances a WHERE a.id = alliance_id AND a.owner_id = auth.uid())
  );

-- posts
DROP POLICY IF EXISTS "posts_select_all" ON posts;
CREATE POLICY "posts_select_all" ON posts FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own" ON posts FOR UPDATE
  TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own" ON posts FOR DELETE
  TO authenticated USING (
    auth.uid() = author_id
    OR (guild_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM guild_members gm WHERE gm.guild_id = posts.guild_id AND gm.user_id = auth.uid() AND gm.role = 'leader'
    ))
  );

-- poll_options
DROP POLICY IF EXISTS "poll_options_select_all" ON poll_options;
CREATE POLICY "poll_options_select_all" ON poll_options FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "poll_options_insert_own" ON poll_options;
CREATE POLICY "poll_options_insert_own" ON poll_options FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  );

-- poll_votes
DROP POLICY IF EXISTS "poll_votes_select_all" ON poll_votes;
CREATE POLICY "poll_votes_select_all" ON poll_votes FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "poll_votes_insert_own" ON poll_votes;
CREATE POLICY "poll_votes_insert_own" ON poll_votes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "poll_votes_delete_own" ON poll_votes;
CREATE POLICY "poll_votes_delete_own" ON poll_votes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- comments
DROP POLICY IF EXISTS "comments_select_all" ON comments;
CREATE POLICY "comments_select_all" ON comments FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own" ON comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own" ON comments FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- reactions
DROP POLICY IF EXISTS "reactions_select_all" ON reactions;
CREATE POLICY "reactions_select_all" ON reactions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "reactions_insert_own" ON reactions;
CREATE POLICY "reactions_insert_own" ON reactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reactions_update_own" ON reactions;
CREATE POLICY "reactions_update_own" ON reactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reactions_delete_own" ON reactions;
CREATE POLICY "reactions_delete_own" ON reactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- saved_posts
DROP POLICY IF EXISTS "saved_posts_select_own" ON saved_posts;
CREATE POLICY "saved_posts_select_own" ON saved_posts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_posts_insert_own" ON saved_posts;
CREATE POLICY "saved_posts_insert_own" ON saved_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_posts_delete_own" ON saved_posts;
CREATE POLICY "saved_posts_delete_own" ON saved_posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- shares
DROP POLICY IF EXISTS "shares_select_all" ON shares;
CREATE POLICY "shares_select_all" ON shares FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "shares_insert_own" ON shares;
CREATE POLICY "shares_insert_own" ON shares FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- reports
DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "reports_select_admin" ON reports;
CREATE POLICY "reports_select_admin" ON reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin" ON reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- events
DROP POLICY IF EXISTS "events_select_all" ON events;
CREATE POLICY "events_select_all" ON events FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own" ON events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE
  TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own" ON events FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- event_attendees
DROP POLICY IF EXISTS "event_attendees_select_all" ON event_attendees;
CREATE POLICY "event_attendees_select_all" ON event_attendees FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "event_attendees_insert_own" ON event_attendees;
CREATE POLICY "event_attendees_insert_own" ON event_attendees FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "event_attendees_delete_own" ON event_attendees;
CREATE POLICY "event_attendees_delete_own" ON event_attendees FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert_any" ON notifications;
CREATE POLICY "notifications_insert_any" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- follows
DROP POLICY IF EXISTS "follows_select_all" ON follows;
CREATE POLICY "follows_select_all" ON follows FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "follows_insert_own" ON follows;
CREATE POLICY "follows_insert_own" ON follows FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "follows_delete_own" ON follows;
CREATE POLICY "follows_delete_own" ON follows FOR DELETE
  TO authenticated USING (auth.uid() = follower_id);

-- friends
DROP POLICY IF EXISTS "friends_select_involved" ON friends;
CREATE POLICY "friends_select_involved" ON friends FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
DROP POLICY IF EXISTS "friends_insert_own" ON friends;
CREATE POLICY "friends_insert_own" ON friends FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "friends_update_involved" ON friends;
CREATE POLICY "friends_update_involved" ON friends FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);
DROP POLICY IF EXISTS "friends_delete_involved" ON friends;
CREATE POLICY "friends_delete_involved" ON friends FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- chat_rooms
DROP POLICY IF EXISTS "chat_rooms_select_member" ON chat_rooms;
CREATE POLICY "chat_rooms_select_member" ON chat_rooms FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chat_room_members m WHERE m.room_id = chat_rooms.id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "chat_rooms_insert_own" ON chat_rooms;
CREATE POLICY "chat_rooms_insert_own" ON chat_rooms FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "chat_rooms_delete_own" ON chat_rooms;
CREATE POLICY "chat_rooms_delete_own" ON chat_rooms FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- chat_room_members
DROP POLICY IF EXISTS "chat_room_members_select_member" ON chat_room_members;
CREATE POLICY "chat_room_members_select_member" ON chat_room_members FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM chat_room_members m WHERE m.room_id = chat_room_members.room_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "chat_room_members_insert_own_or_creator" ON chat_room_members;
CREATE POLICY "chat_room_members_insert_own_or_creator" ON chat_room_members FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM chat_rooms r WHERE r.id = room_id AND r.created_by = auth.uid())
  );
DROP POLICY IF EXISTS "chat_room_members_delete_own" ON chat_room_members;
CREATE POLICY "chat_room_members_delete_own" ON chat_room_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- messages
DROP POLICY IF EXISTS "messages_select_member" ON messages;
CREATE POLICY "messages_select_member" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chat_room_members m WHERE m.room_id = messages.room_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "messages_insert_member" ON messages;
CREATE POLICY "messages_insert_member" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM chat_room_members m WHERE m.room_id = messages.room_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "messages_delete_own" ON messages;
CREATE POLICY "messages_delete_own" ON messages FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

-- guild_gallery
DROP POLICY IF EXISTS "guild_gallery_select_all" ON guild_gallery;
CREATE POLICY "guild_gallery_select_all" ON guild_gallery FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "guild_gallery_insert_member" ON guild_gallery;
CREATE POLICY "guild_gallery_insert_member" ON guild_gallery FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_gallery.guild_id AND gm.user_id = auth.uid() AND gm.role IN ('leader','officer'))
  );
DROP POLICY IF EXISTS "guild_gallery_delete_member" ON guild_gallery;
CREATE POLICY "guild_gallery_delete_member" ON guild_gallery FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_gallery.guild_id AND gm.user_id = auth.uid() AND gm.role IN ('leader','officer'))
  );

-- guild_videos
DROP POLICY IF EXISTS "guild_videos_select_all" ON guild_videos;
CREATE POLICY "guild_videos_select_all" ON guild_videos FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "guild_videos_insert_member" ON guild_videos;
CREATE POLICY "guild_videos_insert_member" ON guild_videos FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_videos.guild_id AND gm.user_id = auth.uid() AND gm.role IN ('leader','officer'))
  );
DROP POLICY IF EXISTS "guild_videos_delete_member" ON guild_videos;
CREATE POLICY "guild_videos_delete_member" ON guild_videos FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_videos.guild_id AND gm.user_id = auth.uid() AND gm.role IN ('leader','officer'))
  );

-- badges
DROP POLICY IF EXISTS "badges_select_all" ON badges;
CREATE POLICY "badges_select_all" ON badges FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "badges_insert_admin" ON badges;
CREATE POLICY "badges_insert_admin" ON badges FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- user_badges
DROP POLICY IF EXISTS "user_badges_select_all" ON user_badges;
CREATE POLICY "user_badges_select_all" ON user_badges FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "user_badges_insert_admin" ON user_badges;
CREATE POLICY "user_badges_insert_admin" ON user_badges FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "user_badges_delete_admin" ON user_badges;
CREATE POLICY "user_badges_delete_admin" ON user_badges FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- app_config
DROP POLICY IF EXISTS "app_config_select_all" ON app_config;
CREATE POLICY "app_config_select_all" ON app_config FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "app_config_update_admin" ON app_config;
CREATE POLICY "app_config_update_admin" ON app_config FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- audit_log
DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log;
CREATE POLICY "audit_log_select_admin" ON audit_log FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "audit_log_insert_admin" ON audit_log;
CREATE POLICY "audit_log_insert_admin" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author_id);
CREATE INDEX IF NOT EXISTS idx_posts_guild ON posts (guild_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_start ON events (start_time);
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages (room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members (user_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);

-- ===== SEED APP CONFIG =====
INSERT INTO app_config (id, community_rules)
VALUES (1, '1. Respeta a todos los miembros. 2. No spam. 3. No contenido ofensivo. 4. No suplantación de identidad. 5. Sigue las normas de Albion Online.')
ON CONFLICT (id) DO NOTHING;

-- ===== TRIGGER: create profile on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    'usuario_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
