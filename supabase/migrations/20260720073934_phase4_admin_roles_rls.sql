/*
# Phase 4 — Admin Roles RLS Policies

## Overview
Updates RLS policies to support the full role hierarchy: supreme_admin > admin > moderator > user.
Previously, admin-only policies checked `role = 'admin'`. Now they check `role IN ('supreme_admin', 'admin', 'moderator')` for moderation actions, and `role IN ('supreme_admin', 'admin')` for administrative actions.

## Changes

### profiles table
- UPDATE policy: users can update their own profile OR admins/mods can update any profile (for suspending/reactivating).
- SELECT policy: unchanged (all authenticated can read).

### posts table
- DELETE policy: owner OR guild leader OR moderators/admins can delete any post.
- UPDATE policy: owner OR moderators/admins can update (for pinning/approving).

### reports table
- SELECT policy: supreme_admin, admin, and moderator can read reports.
- UPDATE policy: supreme_admin, admin, and moderator can resolve reports.

### guilds table
- DELETE policy: owner OR admins can delete guilds.
- UPDATE policy: owner OR admins can update guilds.

### alliances table
- DELETE policy: owner OR admins can delete alliances.
- UPDATE policy: owner OR admins can update alliances.

### app_config table
- UPDATE policy: supreme_admin and admin only (not moderators).

### audit_log table
- INSERT policy: supreme_admin, admin, and moderator can insert audit entries.
- SELECT policy: supreme_admin and admin can read audit log (not moderators).

## Security
- All policies use `auth.uid()` for ownership checks.
- Role checks use `role IN (...)` to cover the full hierarchy.
- Moderators can moderate content but cannot change app configuration or read audit logs.
- Supreme_admin has all admin powers.
*/

-- Helper: check if current user is a moderator or above (supreme_admin, admin, moderator)
-- We inline this check in each policy for clarity.

-- === profiles ===
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin', 'moderator')
  )
)
WITH CHECK (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin', 'moderator')
  )
);

-- === posts ===
DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own_or_moderator"
ON posts FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id
  OR (guild_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM guild_members gm
    WHERE gm.guild_id = posts.guild_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'leader'
  ))
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin', 'moderator')
  )
);

DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own_or_moderator"
ON posts FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin', 'moderator')
  )
)
WITH CHECK (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin', 'moderator')
  )
);

-- === reports ===
DROP POLICY IF EXISTS "reports_select_admin" ON reports;
CREATE POLICY "reports_select_staff"
ON reports FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin', 'moderator')
  )
);

DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_staff"
ON reports FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin', 'moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin', 'moderator')
  )
);

-- === guilds ===
DROP POLICY IF EXISTS "guilds_delete_own" ON guilds;
CREATE POLICY "guilds_delete_own_or_admin"
ON guilds FOR DELETE
TO authenticated
USING (
  auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin')
  )
);

DROP POLICY IF EXISTS "guilds_update_own" ON guilds;
CREATE POLICY "guilds_update_own_or_admin"
ON guilds FOR UPDATE
TO authenticated
USING (
  auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin')
  )
)
WITH CHECK (
  auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin')
  )
);

-- === alliances ===
DROP POLICY IF EXISTS "alliances_delete_own" ON alliances;
CREATE POLICY "alliances_delete_own_or_admin"
ON alliances FOR DELETE
TO authenticated
USING (
  auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin')
  )
);

DROP POLICY IF EXISTS "alliances_update_own" ON alliances;
CREATE POLICY "alliances_update_own_or_admin"
ON alliances FOR UPDATE
TO authenticated
USING (
  auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin')
  )
)
WITH CHECK (
  auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin')
  )
);

-- === app_config ===
DROP POLICY IF EXISTS "app_config_update_admin" ON app_config;
CREATE POLICY "app_config_update_admin_only"
ON app_config FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin')
  )
);

-- === audit_log ===
DROP POLICY IF EXISTS "audit_log_insert_admin" ON audit_log;
CREATE POLICY "audit_log_insert_staff"
ON audit_log FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin', 'moderator')
  )
);

DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log;
CREATE POLICY "audit_log_select_admin_only"
ON audit_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('supreme_admin', 'admin')
  )
);
